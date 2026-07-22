const mongoose = require("mongoose");
const {
  Review,
  Feedback,
  SellerFeedback,
  Product,
  Order,
  OrderItem,
  Store,
} = require("../../../models");

async function recalcFeedback(sellerId) {
  const stats = await SellerFeedback.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        status: "published",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        positiveCount: {
          $sum: { $cond: [{ $eq: ["$rating", "positive"] }, 1, 0] }
        },
        neutralCount: {
          $sum: { $cond: [{ $eq: ["$rating", "neutral"] }, 1, 0] }
        },
        negativeCount: {
          $sum: { $cond: [{ $eq: ["$rating", "negative"] }, 1, 0] }
        },
        recent: {
          $sum: {
            $cond: [
              { $gte: ["$createdAt", new Date(Date.now() - 30 * 86400000)] },
              1,
              0,
            ],
          },
        },
        lastDate: { $max: "$createdAt" },
      },
    },
  ]);

  const value = stats[0] || {
    total: 0,
    positiveCount: 0,
    neutralCount: 0,
    negativeCount: 0,
    recent: 0,
    lastDate: null,
  };

  const denom = value.positiveCount + value.negativeCount;
  const positiveRate = denom ? (value.positiveCount / denom) * 100 : 0;
  const avg = value.total
    ? (value.positiveCount * 5 + value.neutralCount * 3 + value.negativeCount * 1) / value.total
    : 0;

  const distribution = {
    1: value.negativeCount,
    2: 0,
    3: value.neutralCount,
    4: 0,
    5: value.positiveCount
  };

  const positiveFeedbackPercent = Number(positiveRate.toFixed(1));
  await Store.findOneAndUpdate(
    { sellerId },
    { positiveFeedbackPercent },
    { upsert: true }
  );

  return Feedback.findOneAndUpdate(
    { sellerId },
    {
      averageRating: Number((avg || 0).toFixed(2)),
      totalReviews: value.total,
      positiveRate: positiveFeedbackPercent,
      ratingDistribution: distribution,
      recentCount: value.recent,
      lastReviewAt: value.lastDate,
    },
    { upsert: true, new: true },
  );
}

async function ownedReview(reviewId, userId) {
  return Review.findOne({ _id: reviewId, sellerId: userId });
}

exports.getProductReviews = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const query = { productId: req.params.productId, status: "published" };
    if (req.query.rating) query.rating = parseInt(req.query.rating, 10);
    const sortMap = {
      newest: { reviewDate: -1 },
      oldest: { reviewDate: 1 },
      highest_rating: { rating: -1, reviewDate: -1 },
      lowest_rating: { rating: 1, reviewDate: -1 },
    };
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("reviewerId", "username firstName lastName avatarURL")
        .sort(sortMap[req.query.sort] || sortMap.newest)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);

    // Product reviews summary stats
    const summaryStats = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(req.params.productId), status: "published" } },
      {
        $group: {
          _id: null,
          avg: { $avg: "$rating" },
          total: { $sum: 1 },
          ratings: { $push: "$rating" }
        }
      }
    ]);
    const sumVal = summaryStats[0] || { avg: 0, total: 0, ratings: [] };
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    sumVal.ratings.forEach((rating) => {
      if (distribution[rating] !== undefined) distribution[rating] += 1;
    });
    const summary = {
      averageRating: Number((sumVal.avg || 0).toFixed(2)),
      totalReviews: sumVal.total,
      ratingDistribution: distribution
    };

    res.json({
      reviews,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary
    });
  } catch (err) {
    next(err);
  }
};

exports.getSellerFeedbackAggregate = async (req, res, next) => {
  try {
    const feedback = await Feedback.findOne({
      sellerId: req.params.sellerId,
    }).lean();
    if (feedback) {
      const positiveCount = feedback.ratingDistribution["5"] || 0;
      const neutralCount = feedback.ratingDistribution["3"] || 0;
      const negativeCount = feedback.ratingDistribution["1"] || 0;
      return res.json({
        ...feedback,
        positiveCount,
        neutralCount,
        negativeCount
      });
    }
    res.json({
      sellerId: req.params.sellerId,
      averageRating: 0,
      totalReviews: 0,
      positiveRate: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  } catch (err) {
    next(err);
  }
};

exports.getBuyerDeliveredOrdersForProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const buyerOrders = await Order.find({
      buyerId: req.user._id,
      status: "delivered",
    })
      .select("_id orderNumber deliveredDate paymentDate updatedAt")
      .lean();
    if (buyerOrders.length === 0) return res.json([]);
    const orderIds = buyerOrders.map((order) => order._id);
    const items = await OrderItem.find({
      productId,
      orderId: { $in: orderIds },
    })
      .select("orderId")
      .lean();
    const orderIdSet = new Set(items.map((item) => item.orderId.toString()));
    const result = buyerOrders
      .filter((order) => orderIdSet.has(order._id.toString()))
      .map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber || order._id,
        deliveredDate:
          order.deliveredDate || order.paymentDate || order.updatedAt,
      }));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.createProductReview = async (req, res, next) => {
  try {
    const rating = parseInt(req.body.rating, 10);
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: "rating must be 1..5" });
    if (req.body.comment && req.body.comment.length > 5000)
      return res
        .status(400)
        .json({ message: "comment cannot exceed 5000 characters" });
    const product = await Product.findById(req.params.productId).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    const orders = await Order.find({
      buyerId: req.user._id,
      status: "delivered",
    })
      .select("_id")
      .lean();
    const boughtItem = await OrderItem.findOne({
      productId: product._id,
      orderId: { $in: orders.map((order) => order._id) },
    }).lean();
    if (!boughtItem)
      return res
        .status(403)
        .json({
          message: "Only buyers with a delivered order can review this product",
        });
    const orderId = req.body.orderId || boughtItem.orderId;
    if (req.body.orderId) {
      const orderCheck = await Order.findOne({
        _id: orderId,
        buyerId: req.user._id,
        status: "delivered",
      }).lean();
      if (!orderCheck)
        return res
          .status(403)
          .json({ message: "Invalid order for this buyer" });
      const itemCheck = await OrderItem.findOne({
        orderId,
        productId: product._id,
      }).lean();
      if (!itemCheck)
        return res
          .status(403)
          .json({ message: "Order doesn't contain this product" });
    }
    if (await Review.findOne({ reviewerId: req.user._id, orderId }))
      return res
        .status(409)
        .json({ message: "You have already reviewed this order" });
    const review = await Review.create({
      productId: product._id,
      reviewerId: req.user._id,
      sellerId: product.sellerId,
      orderId,
      rating,
      title: req.body.title || "",
      comment: req.body.comment || "",
      photos: (req.files || []).map((file) => "/uploads/" + file.filename),
      verifiedPurchase: true,
    });
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
};

exports.getSellerReviews = async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.user._id })
      .select("_id")
      .lean();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const query = {
      productId: { $in: products.map((product) => product._id) },
    };
    const andClauses = [];
    if (req.query.status && req.query.status !== "all") {
      andClauses.push({ status: req.query.status === "reported" ? "pending_moderation" : req.query.status });
    }
    if (req.query.rating) {
      andClauses.push({ rating: parseInt(req.query.rating, 10) });
    }
    if (req.query.hasResponse) {
      if (req.query.hasResponse === "true") {
        andClauses.push({ "sellerResponse.message": { $exists: true, $ne: "" } });
      } else if (req.query.hasResponse === "false") {
        andClauses.push({
          $or: [
            { "sellerResponse.message": { $exists: false } },
            { "sellerResponse.message": "" },
          ],
        });
      }
    }
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = { $regex: req.query.search.trim(), $options: "i" };
      andClauses.push({
        $or: [
          { comment: searchRegex },
          { title: searchRegex },
        ],
      });
    }
    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    const sortMap = {
      newest: { reviewDate: -1 },
      oldest: { reviewDate: 1 },
      highest_rating: { rating: -1, reviewDate: -1 },
      lowest_rating: { rating: 1, reviewDate: -1 },
    };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("productId", "title images")
        .populate("reviewerId", "username firstName lastName avatarURL")
        .sort(sortMap[req.query.sort] || sortMap.newest)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);
    res.json({
      reviews,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getReviewStatistics = async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).select("_id").lean();
    const productIds = products.map((product) => product._id);

    const stats = await Review.aggregate([
      {
        $match: {
          productId: { $in: productIds },
          status: "published"
        }
      },
      {
        $group: {
          _id: null,
          avg: { $avg: "$rating" },
          total: { $sum: 1 },
          ratings: { $push: "$rating" }
        }
      }
    ]);

    const val = stats[0] || { avg: 0, total: 0, ratings: [] };
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    val.ratings.forEach((r) => {
      if (distribution[r] !== undefined) distribution[r] += 1;
    });

    const respondedCount = await Review.countDocuments({
      productId: { $in: productIds },
      "sellerResponse.message": { $exists: true, $ne: "" },
    });

    const responseRate = val.total > 0 ? Number(((respondedCount / val.total) * 100).toFixed(1)) : 0;

    res.json({
      averageRating: Number((val.avg || 0).toFixed(2)),
      totalReviews: val.total,
      ratingDistribution: distribution,
      respondedCount,
      responseRate
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrdersAwaitingFeedback = async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.user._id })
      .select("_id")
      .lean();
    const productIds = products.map((product) => product._id);
    if (productIds.length === 0) return res.json([]);
    const orderItems = await OrderItem.find({ productId: { $in: productIds } })
      .populate({
        path: "orderId",
        match: { status: "delivered" },
        populate: { path: "buyerId", select: "username firstName lastName" },
      })
      .populate("productId", "title")
      .lean();
    const uniqueOrders = [];
    const seenOrderIds = new Set();
    for (const item of orderItems) {
      const order = item.orderId;
      if (!order) continue;
      const orderIdString = order._id.toString();
      if (seenOrderIds.has(orderIdString)) continue;
      seenOrderIds.add(orderIdString);
      uniqueOrders.push(order);
    }
    if (uniqueOrders.length === 0) return res.json([]);
    const orderIds = uniqueOrders.map((order) => order._id);

    const existingFeedbacks = await SellerFeedback.find({
      orderId: { $in: orderIds }
    })
      .select("orderId")
      .lean();
    const feedbackSet = new Set(
      existingFeedbacks.map((fb) => fb.orderId.toString()),
    );

    const result = uniqueOrders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber || order._id,
      buyer: order.buyerId,
      deliveredDate: order.deliveredDate || order.paymentDate || order.updatedAt,
      status: order.status,
      hasReview: feedbackSet.has(order._id.toString()),
      hasFeedback: feedbackSet.has(order._id.toString()),
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

function validateResponseMessage(message) {
  const trimmed = (message || "").trim();
  if (!trimmed || trimmed.length > 5000) {
    return "message is required and cannot exceed 5000 characters";
  }
  return null;
}

exports.respondToReview = async (req, res, next) => {
  try {
    const review = await ownedReview(req.params.reviewId, req.user._id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    const validationError = validateResponseMessage(req.body.message);
    if (validationError)
      return res.status(400).json({ message: validationError });
    const now = new Date();
    review.sellerResponse = {
      message: req.body.message.trim(),
      respondedAt: now,
      updatedAt: now,
      isSystem: false,
      templateKey: undefined,
    };
    await review.save();
    res.json(review);
  } catch (err) {
    next(err);
  }
};

exports.updateReviewResponse = async (req, res, next) => {
  try {
    const review = await ownedReview(req.params.reviewId, req.user._id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    const validationError = validateResponseMessage(req.body.message);
    if (validationError)
      return res.status(400).json({ message: validationError });
    const now = new Date();
    review.sellerResponse = {
      message: req.body.message.trim(),
      respondedAt: review.sellerResponse?.respondedAt || now,
      updatedAt: now,
      isSystem: false,
      templateKey: review.sellerResponse?.templateKey,
    };
    await review.save();
    res.json(review);
  } catch (err) {
    next(err);
  }
};

exports.systemRespondToReview = async (req, res, next) => {
  try {
    const review = await ownedReview(req.params.reviewId, req.user._id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    const validationError = validateResponseMessage(req.body.message);
    if (validationError)
      return res.status(400).json({ message: validationError });
    if (!req.body.templateKey)
      return res
        .status(400)
        .json({ message: "templateKey is required for system responses" });
    const now = new Date();
    review.sellerResponse = {
      message: req.body.message.trim(),
      respondedAt: now,
      updatedAt: now,
      isSystem: true,
      templateKey: req.body.templateKey,
    };
    await review.save();
    res.json(review);
  } catch (err) {
    next(err);
  }
};

async function safeRecalcFeedback(sellerId) {
  try {
    await recalcFeedback(sellerId);
  } catch (err) {
    console.error("recalcFeedback failed for sellerId=" + sellerId + ":", err);
  }
}

exports.hideReview = async (req, res, next) => {
  try {
    const review = await ownedReview(req.params.reviewId, req.user._id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.status !== "published")
      return res
        .status(400)
        .json({ message: "Only published reviews can be hidden" });
    review.status = "hidden";
    await review.save();
    res.json(review);
  } catch (err) {
    next(err);
  }
};

exports.unhideReview = async (req, res, next) => {
  try {
    const review = await ownedReview(req.params.reviewId, req.user._id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.status !== "hidden")
      return res.status(400).json({ message: "Review is not hidden" });
    review.status = "published";
    await review.save();
    res.json(review);
  } catch (err) {
    next(err);
  }
};

exports.reportReview = async (req, res, next) => {
  try {
    const review = await ownedReview(req.params.reviewId, req.user._id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    review.isReported = true;
    review.reportedReason = req.body.reason || "";
    review.reportedAt = new Date();
    review.status = "pending_moderation";
    await review.save();
    res.json(review);
  } catch (err) {
    next(err);
  }
};

exports.getSellerTemplates = async (req, res, next) => {
  try {
    const feedback = await Feedback.findOne({ sellerId: req.user._id }).lean();
    res.json(feedback?.templates || []);
  } catch (err) {
    next(err);
  }
};

exports.updateSellerTemplates = async (req, res, next) => {
  try {
    const incoming = Array.isArray(req.body.templates) ? req.body.templates : [];
    const existingDoc = await Feedback.findOne({ sellerId: req.user._id })
      .select("templates")
      .lean();
    const existing = existingDoc?.templates || [];
    const merged = incoming.map((template) => {
      const prev = existing.find((entry) => entry.templateKey === template.templateKey);
      return {
        ...template,
        createdAt: prev?.createdAt || new Date(),
      };
    });
    const feedback = await Feedback.findOneAndUpdate(
      { sellerId: req.user._id },
      { templates: merged },
      { upsert: true, new: true },
    );
    res.json(feedback.templates);
  } catch (err) {
    next(err);
  }
};

// Seller Feedback logic APIs

exports.getSellerFeedbackList = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const query = { sellerId: req.params.sellerId, status: "published" };

    const [feedbacks, total] = await Promise.all([
      SellerFeedback.find(query)
        .populate("buyerId", "username firstName lastName avatarURL")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SellerFeedback.countDocuments(query),
    ]);

    res.json({
      feedbacks,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
};

exports.getBuyerDeliveredOrdersForSeller = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.find({ buyerId: req.user._id, status: "delivered" }).lean();
    if (orders.length === 0) return res.json([]);

    const orderIds = orders.map(o => o._id);

    const products = await Product.find({ sellerId }).select("_id title images price").lean();
    const productIds = products.map(p => p._id);
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const eligibleItems = await OrderItem.find({
      orderId: { $in: orderIds },
      productId: { $in: productIds }
    }).lean();

    const itemsByOrder = new Map();
    for (const item of eligibleItems) {
      const orderKey = item.orderId.toString();
      if (!itemsByOrder.has(orderKey)) itemsByOrder.set(orderKey, []);
      const product = productMap.get(item.productId.toString());
      itemsByOrder.get(orderKey).push({
        _id: item._id,
        productId: item.productId,
        title: product?.title || item.title || "Item",
        image: product?.images?.[0] || item.image || "",
        price: item.price || product?.price || 0,
        quantity: item.quantity || 1,
      });
    }

    const uniqueEligibleOrderIds = [...itemsByOrder.keys()];

    const existingFeedback = await SellerFeedback.find({
      orderId: { $in: uniqueEligibleOrderIds }
    }).select("orderId").lean();
    const feedbackedOrderIds = new Set(existingFeedback.map(fb => fb.orderId.toString()));

    const awaitingFeedbackOrders = orders
      .filter(o => uniqueEligibleOrderIds.includes(o._id.toString()) && !feedbackedOrderIds.has(o._id.toString()))
      .map(o => ({
        _id: o._id,
        orderNumber: o.orderNumber || o._id,
        deliveredDate: o.deliveredDate || o.paymentDate || o.updatedAt,
        items: itemsByOrder.get(o._id.toString()) || [],
      }));

    res.json(awaitingFeedbackOrders);
  } catch (err) {
    next(err);
  }
};

exports.createSellerFeedback = async (req, res, next) => {
  try {
    const { orderId, rating, comment } = req.body;
    const sellerId = req.params.sellerId;

    if (!["positive", "neutral", "negative"].includes(rating)) {
      return res.status(400).json({ message: "Rating must be positive, neutral, or negative" });
    }

    if (comment && comment.length > 2000) {
      return res.status(400).json({ message: "Comment cannot exceed 2000 characters" });
    }

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user._id,
      status: "delivered"
    }).lean();
    if (!order) {
      return res.status(400).json({ message: "Order not found, not delivered, or not owned by you" });
    }

    const products = await Product.find({ sellerId }).select("_id").lean();
    const productIds = products.map(p => p._id);
    const orderItem = await OrderItem.findOne({
      orderId,
      productId: { $in: productIds }
    }).lean();

    if (!orderItem) {
      return res.status(400).json({ message: "Order does not contain products from this seller" });
    }

    const existing = await SellerFeedback.findOne({ orderId }).lean();
    if (existing) {
      return res.status(409).json({ message: "You have already left feedback for this order" });
    }

    const feedback = await SellerFeedback.create({
      sellerId,
      buyerId: req.user._id,
      orderId,
      rating,
      comment: comment || "",
      status: "published"
    });

    await safeRecalcFeedback(sellerId);

    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
};

exports.getMySellerFeedback = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const query = { sellerId: req.user._id };

    const andClauses = [];
    if (req.query.status && req.query.status !== "all") {
      if (req.query.status === "reported") {
        andClauses.push({ isReported: true });
      } else {
        andClauses.push({ status: req.query.status });
      }
    }
    if (req.query.rating) {
      andClauses.push({ rating: req.query.rating });
    }
    if (req.query.hasResponse) {
      if (req.query.hasResponse === "true") {
        andClauses.push({ "sellerResponse.message": { $exists: true, $ne: "" } });
      } else if (req.query.hasResponse === "false") {
        andClauses.push({
          $or: [
            { "sellerResponse.message": { $exists: false } },
            { "sellerResponse.message": "" },
          ],
        });
      }
    }
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = { $regex: req.query.search.trim(), $options: "i" };
      andClauses.push({ comment: searchRegex });
    }

    if (req.query.period && req.query.period !== "all") {
      const now = new Date();
      const sinceDate = new Date(now);
      if (req.query.period === "30d") {
        sinceDate.setDate(now.getDate() - 30);
      } else if (req.query.period === "6m") {
        sinceDate.setMonth(now.getMonth() - 6);
      } else if (req.query.period === "12m") {
        sinceDate.setMonth(now.getMonth() - 12);
      }
      if (!Number.isNaN(sinceDate.getTime())) {
        andClauses.push({ createdAt: { $gte: sinceDate } });
      }
    }

    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    const [feedbacks, total] = await Promise.all([
      SellerFeedback.find(query)
        .populate("buyerId", "username firstName lastName avatarURL")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SellerFeedback.countDocuments(query),
    ]);

    res.json({
      feedbacks,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyFeedbackStatistics = async (req, res, next) => {
  try {
    await safeRecalcFeedback(req.user._id);
    const feedback = await Feedback.findOne({ sellerId: req.user._id }).lean();
    const stats = feedback || {
      averageRating: 0,
      totalReviews: 0,
      positiveRate: 0,
      recentCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    const positiveCount = stats.ratingDistribution["5"] || 0;
    const neutralCount = stats.ratingDistribution["3"] || 0;
    const negativeCount = stats.ratingDistribution["1"] || 0;

    const totalFeedbackCount = await SellerFeedback.countDocuments({ sellerId: req.user._id });
    const respondedCount = await SellerFeedback.countDocuments({
      sellerId: req.user._id,
      "sellerResponse.message": { $exists: true, $ne: "" },
    });

    const responseRate = totalFeedbackCount > 0 ? Number(((respondedCount / totalFeedbackCount) * 100).toFixed(1)) : 0;

    res.json({
      ...stats,
      positiveCount,
      neutralCount,
      negativeCount,
      respondedCount,
      responseRate,
    });
  } catch (err) {
    next(err);
  }
};

exports.respondToFeedback = async (req, res, next) => {
  try {
    const feedback = await SellerFeedback.findOne({ _id: req.params.feedbackId, sellerId: req.user._id });
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });

    const validationError = validateResponseMessage(req.body.message);
    if (validationError) return res.status(400).json({ message: validationError });

    const now = new Date();
    const isEdit = Boolean(
      feedback.sellerResponse?.message &&
        feedback.sellerResponse.message.trim() !== "",
    );
    feedback.sellerResponse = {
      message: req.body.message.trim(),
      respondedAt: isEdit ? feedback.sellerResponse.respondedAt : now,
      updatedAt: now
    };
    await feedback.save();
    res.json(feedback);
  } catch (err) {
    next(err);
  }
};

exports.hideFeedback = async (req, res, next) => {
  try {
    const feedback = await SellerFeedback.findOne({ _id: req.params.feedbackId, sellerId: req.user._id });
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });
    if (feedback.status !== "published") return res.status(400).json({ message: "Only published feedback can be hidden" });

    feedback.status = "hidden";
    await feedback.save();
    await safeRecalcFeedback(feedback.sellerId);
    res.json(feedback);
  } catch (err) {
    next(err);
  }
};

exports.unhideFeedback = async (req, res, next) => {
  try {
    const feedback = await SellerFeedback.findOne({ _id: req.params.feedbackId, sellerId: req.user._id });
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });
    if (feedback.status !== "hidden") return res.status(400).json({ message: "Feedback is not hidden" });

    feedback.status = "published";
    await feedback.save();
    await safeRecalcFeedback(feedback.sellerId);
    res.json(feedback);
  } catch (err) {
    next(err);
  }
};

exports.reportFeedback = async (req, res, next) => {
  try {
    const feedback = await SellerFeedback.findOne({ _id: req.params.feedbackId, sellerId: req.user._id });
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });

    feedback.isReported = true;
    feedback.reportedReason = req.body.reason || "";
    feedback.reportedAt = new Date();
    await feedback.save();
    res.json(feedback);
  } catch (err) {
    next(err);
  }
};

module.exports.recalcFeedback = recalcFeedback;

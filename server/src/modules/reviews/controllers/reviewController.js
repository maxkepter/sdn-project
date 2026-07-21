const mongoose = require("mongoose");
const {
  Review,
  Feedback,
  Product,
  Order,
  OrderItem,
} = require("../../../models");

async function recalcFeedback(sellerId) {
  const stats = await Review.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        status: "published",
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
        total: { $sum: 1 },
        ratings: { $push: "$rating" },
        recent: {
          $sum: {
            $cond: [
              { $gte: ["$reviewDate", new Date(Date.now() - 30 * 86400000)] },
              1,
              0,
            ],
          },
        },
        lastDate: { $max: "$reviewDate" },
      },
    },
  ]);
  const value = stats[0] || {
    avg: 0,
    total: 0,
    ratings: [],
    recent: 0,
    lastDate: null,
  };
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  value.ratings.forEach((rating) => {
    if (distribution[rating] !== undefined) distribution[rating] += 1;
  });
  const positiveRate = value.total
    ? ((distribution[4] + distribution[5]) / value.total) * 100
    : 0;
  return Feedback.findOneAndUpdate(
    { sellerId },
    {
      averageRating: Number((value.avg || 0).toFixed(2)),
      totalReviews: value.total,
      positiveRate: Number(positiveRate.toFixed(1)),
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
    res.json({
      reviews,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
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
    res.json(
      feedback || {
        sellerId: req.params.sellerId,
        averageRating: 0,
        totalReviews: 0,
        positiveRate: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    );
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
    await safeRecalcFeedback(product.sellerId);
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
    const totalReviews = await Review.countDocuments({ productId: { $in: productIds } });
    const respondedCount = await Review.countDocuments({
      productId: { $in: productIds },
      "sellerResponse.message": { $exists: true, $ne: "" },
    });
    await safeRecalcFeedback(req.user._id);
    const feedback = await Feedback.findOne({ sellerId: req.user._id }).lean();
    const stats = feedback || {
      averageRating: 0,
      totalReviews: 0,
      positiveRate: 0,
      recentCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    const responseRate = totalReviews > 0 ? Number(((respondedCount / totalReviews) * 100).toFixed(1)) : 0;
    res.json({
      ...stats,
      totalReviews: totalReviews || stats.totalReviews,
      respondedCount,
      responseRate,
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
    const existingReviews = await Review.find({
      orderId: { $in: orderIds },
      productId: { $in: productIds },
    })
      .select("orderId productId")
      .lean();
    const reviewedSet = new Set(
      existingReviews.map((review) => review.orderId.toString()),
    );
    const result = uniqueOrders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber || order._id,
      buyer: order.buyerId,
      deliveredDate: order.deliveredDate || order.paymentDate || order.updatedAt,
      status: order.status,
      hasReview: reviewedSet.has(order._id.toString()),
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Three behaviors kept deliberately separate so future auth/audit work doesn't
// have to read a parameterized helper.
//   POST /respond         -> new seller-authored response
//   PUT  /response        -> edit existing response (preserve respondedAt)
//   POST /system-response -> backoffice/system-posted response with templateKey

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

// recalcFeedback may legitimately fail (DB blip). Squelch it so a transient
// aggregate hiccup doesn't fail the user-facing response; the recalc can run
// lazily on the next stats call via S-3.
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
    await safeRecalcFeedback(review.sellerId);
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
    await safeRecalcFeedback(review.sellerId);
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
    await safeRecalcFeedback(review.sellerId);
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

module.exports.recalcFeedback = recalcFeedback;

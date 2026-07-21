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
    await recalcFeedback(product.sellerId);
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
    if (req.query.status) query.status = req.query.status;
    if (req.query.rating) query.rating = parseInt(req.query.rating, 10);
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("productId", "title images")
        .populate("reviewerId", "username firstName lastName avatarURL")
        .sort({ reviewDate: -1 })
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
    const feedback = await Feedback.findOne({ sellerId: req.user._id }).lean();
    res.json(
      feedback || {
        averageRating: 0,
        totalReviews: 0,
        positiveRate: 0,
        recentCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    );
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
    const orders = [];
    const seenOrderIds = new Set();
    for (const item of orderItems) {
      const order = item.orderId;
      if (!order) continue;
      if (seenOrderIds.has(order._id.toString())) continue;
      seenOrderIds.add(order._id.toString());
      const existingReview = await Review.findOne({ orderId: order._id }).lean();
      orders.push({
        _id: order._id,
        orderNumber: order.orderNumber || order._id,
        buyer: order.buyerId,
        deliveredDate: order.deliveredDate || order.updatedAt,
        status: order.status,
        hasReview: Boolean(existingReview),
      });
    }
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

async function saveResponse(req, res, next, system) {
  try {
    const review = await ownedReview(req.params.reviewId, req.user._id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    const message = (req.body.message || "").trim();
    if (!message || message.length > 5000)
      return res
        .status(400)
        .json({
          message: "message is required and cannot exceed 5000 characters",
        });
    const now = new Date();
    review.sellerResponse = {
      message,
      respondedAt: review.sellerResponse?.respondedAt || now,
      updatedAt: now,
      isSystem: system,
      templateKey: req.body.templateKey || undefined,
    };
    await review.save();
    res.json(review);
  } catch (err) {
    next(err);
  }
}
exports.respondToReview = (req, res, next) =>
  saveResponse(req, res, next, false);
exports.systemRespondToReview = (req, res, next) =>
  saveResponse(req, res, next, true);
exports.updateReviewResponse = async (req, res, next) =>
  saveResponse(req, res, next, false);

exports.hideReview = async (req, res, next) => {
  try {
    const review = await ownedReview(req.params.reviewId, req.user._id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    review.status = "hidden";
    await review.save();
    await recalcFeedback(review.sellerId);
    res.json(review);
  } catch (err) {
    next(err);
  }
};
exports.unhideReview = async (req, res, next) => {
  try {
    const review = await ownedReview(req.params.reviewId, req.user._id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    review.status = "published";
    await review.save();
    await recalcFeedback(review.sellerId);
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
    await recalcFeedback(review.sellerId);
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
    const templates = Array.isArray(req.body.templates)
      ? req.body.templates
      : [];
    const feedback = await Feedback.findOneAndUpdate(
      { sellerId: req.user._id },
      { templates },
      { upsert: true, new: true },
    );
    res.json(feedback.templates);
  } catch (err) {
    next(err);
  }
};

module.exports.recalcFeedback = recalcFeedback;

const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const { Review, SellerFeedback } = require("../models");
const { recalcFeedback } = require("../modules/reviews/controllers/reviewController");

const runMigration = async () => {
  await connectDatabase();

  console.log("Starting migration: Reviews -> SellerFeedback");

  const reviews = await Review.find({
    orderId: { $exists: true, $ne: null },
    reviewerId: { $exists: true, $ne: null },
    sellerId: { $exists: true, $ne: null }
  }).lean();

  console.log(`Found ${reviews.length} product reviews with order context.`);

  let createdCount = 0;
  let skippedCount = 0;
  const affectedSellers = new Set();

  for (const review of reviews) {
    const existing = await SellerFeedback.findOne({ orderId: review.orderId }).lean();
    if (existing) {
      skippedCount++;
      continue;
    }

    let rating = "neutral";
    if (review.rating >= 4) {
      rating = "positive";
    } else if (review.rating <= 2) {
      rating = "negative";
    }

    await SellerFeedback.create({
      sellerId: review.sellerId,
      buyerId: review.reviewerId,
      orderId: review.orderId,
      rating,
      comment: review.comment || "Migrated review comment",
      sellerResponse: review.sellerResponse ? {
        message: review.sellerResponse.message,
        respondedAt: review.sellerResponse.respondedAt,
        updatedAt: review.sellerResponse.updatedAt
      } : undefined,
      status: review.status === "hidden" ? "hidden" : "published",
      isReported: review.isReported || false,
      reportedReason: review.reportedReason || "",
      reportedAt: review.reportedAt,
      createdAt: review.createdAt || review.reviewDate,
      updatedAt: review.updatedAt || review.reviewDate
    });

    createdCount++;
    affectedSellers.add(review.sellerId.toString());
  }

  console.log(`Created ${createdCount} SellerFeedback documents. Skipped ${skippedCount} duplicates.`);

  console.log("Recalculating feedback stats for affected sellers...");
  for (const sellerId of affectedSellers) {
    console.log(`Recalculating for seller: ${sellerId}`);
    try {
      await recalcFeedback(sellerId);
    } catch (err) {
      console.error(`Failed to recalc for seller ${sellerId}:`, err);
    }
  }

  console.log("Migration completed successfully!");
  mongoose.connection.close();
};

runMigration().catch(err => {
  console.error("Migration failed:", err);
  if (mongoose.connection) {
    mongoose.connection.close();
  }
  process.exit(1);
});

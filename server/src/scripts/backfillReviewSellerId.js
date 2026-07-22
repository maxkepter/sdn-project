/**
 * One-time backfill script: legacy Review documents that pre-date the sellerId
 * field will fail the ownedReview() ownership check in reviewController.js.
 * This script walks every Review whose sellerId is missing/null and copies
 * the sellerId from the linked Product so future auth/restaurant gating works.
 *
 * Run: npm run backfill:reviews
 * Safe to run repeatedly: it only touches docs that are still missing sellerId.
 */
const { Review, Product } = require("../models");

async function backfill() {
  const reviews = await Review.find({
    $or: [{ sellerId: { $exists: false } }, { sellerId: null }],
  });
  let count = 0;
  let skipped = 0;
  for (const review of reviews) {
    if (!review.productId) {
      skipped++;
      continue;
    }
    const product = await Product.findById(review.productId)
      .select("sellerId")
      .lean();
    if (product && product.sellerId) {
      review.sellerId = product.sellerId;
      await review.save();
      count++;
    } else {
      skipped++;
    }
  }
  console.log(
    `Backfilled ${count} reviews (skipped ${skipped} without resolvable product/seller)`,
  );
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    title: { type: String, default: "", maxlength: 200 },
    photos: { type: [String], default: [] },
    status: { type: String, enum: ["published", "hidden", "pending_moderation", "removed"], default: "published", index: true },
    sellerResponse: {
      message: { type: String, maxlength: 5000 },
      respondedAt: Date,
      updatedAt: Date,
      isSystem: { type: Boolean, default: false },
      templateKey: String,
    },
    isReported: { type: Boolean, default: false },
    reportedReason: { type: String, default: "" },
    reportedAt: Date,
    verifiedPurchase: { type: Boolean, default: false },
    reviewDate: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ sellerId: 1, status: 1, reviewDate: -1 });
ReviewSchema.index({ productId: 1, status: 1 });
ReviewSchema.index({ reviewerId: 1, orderId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Review", ReviewSchema);

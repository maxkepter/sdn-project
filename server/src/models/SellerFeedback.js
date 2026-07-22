const mongoose = require("mongoose");
const { Schema } = mongoose;

const SellerFeedbackSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    rating: { type: String, enum: ["positive", "neutral", "negative"], required: true, index: true },
    comment: { type: String, default: "", maxlength: 2000 },
    sellerResponse: {
      message: { type: String, maxlength: 5000 },
      respondedAt: Date,
      updatedAt: Date
    },
    status: { type: String, enum: ["published", "hidden", "removed"], default: "published", index: true },
    isReported: { type: Boolean, default: false },
    reportedReason: { type: String, default: "" },
    reportedAt: Date
  },
  { timestamps: true }
);

SellerFeedbackSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("SellerFeedback", SellerFeedbackSchema);

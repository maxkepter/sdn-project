const mongoose = require("mongoose");
const { Schema } = mongoose;

const FeedbackSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    positiveRate: { type: Number, default: 0, min: 0, max: 100 },
    ratingDistribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 },
    },
    recentCount: { type: Number, default: 0 },
    lastReviewAt: Date,
    templates: [
      {
        templateKey: { type: String, required: true },
        message: { type: String, required: true, maxlength: 5000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", FeedbackSchema);

const mongoose = require("mongoose");
const { Schema } = mongoose;

const StoreCategorySchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    level: { type: Number, default: 1 },
    subcategories: { type: Number, default: 0 },
    listings: { type: Number, default: 0 },
    categoryNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoreCategory", StoreCategorySchema);

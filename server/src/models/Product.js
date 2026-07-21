const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    images: { type: [String], default: [] },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    storeCategoryId: { type: Schema.Types.ObjectId, ref: "StoreCategory", default: null },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isAuction: { type: Boolean, default: false },
    auctionEndTime: { type: Date },
    isHidden: { type: Boolean, default: false },
    sku: { type: String, default: "" },
    condition: { type: String, default: "" },
    itemSpecifics: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);

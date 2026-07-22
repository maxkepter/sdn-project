const mongoose = require("mongoose");
const { Schema } = mongoose;

const storeDataSchema = new Schema(
  {
    storeName: { type: String, trim: true, default: "Store Name" },
    description: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    bannerImageURL: { type: String, default: "" },
    categoryType: { type: String, default: "Store" },
    featuredListingsType: { type: String, default: "Manual" },
    featuredListingsRow: { type: String, default: "Featured items" },
    featuredCategories: [{
      categoryId: { type: Schema.Types.ObjectId, ref: "StoreCategory" },
      name: { type: String },
      imageUrl: { type: String, default: "" }
    }],
    storyTitle: { type: String, maxLength: 30, default: "" },
    storyText: { type: String, maxLength: 400, default: "" },
    storyImageUrl: { type: String, default: "" },
    policies: [{
      name: { type: String }, // "Shipping", "Return", "Warranty", "Data Privacy Policy", "Other policies"
      content: { type: String, maxLength: 4000 }
    }]
  },
  { _id: false }
);

const StoreSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    slug: { type: String, unique: true, sparse: true },
    draft: { type: storeDataSchema, default: () => ({}) },
    published: { type: storeDataSchema, default: () => ({}) },
    hasUnpublishedChanges: { type: Boolean, default: false },
    followersCount: { type: Number, default: 0 },
    itemsSold: { type: Number, default: 0 },
    positiveFeedbackPercent: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Store", StoreSchema);

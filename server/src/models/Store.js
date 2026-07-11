const mongoose = require("mongoose");
const { Schema } = mongoose;

const StoreSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    storeName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    bannerImageURL: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Store", StoreSchema);

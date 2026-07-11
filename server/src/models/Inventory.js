const mongoose = require("mongoose");
const { Schema } = mongoose;

const InventorySchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  }
);

module.exports = mongoose.model("Inventory", InventorySchema);

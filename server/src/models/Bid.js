const mongoose = require("mongoose");
const { Schema } = mongoose;

const BidSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  bidderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true, min: 0 },
  bidTime: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Bid", BidSchema);

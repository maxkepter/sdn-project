const mongoose = require("mongoose");
const { Schema } = mongoose;

const ShippingInfoSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    carrier: { type: String, required: true },
    trackingNumber: { type: String },
    status: {
      type: String,
      enum: ["preparing", "in_transit", "delivered", "failed"],
      default: "preparing",
    },
    estimatedArrival: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShippingInfo", ShippingInfoSchema);

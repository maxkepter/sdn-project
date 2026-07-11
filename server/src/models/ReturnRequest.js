const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReturnRequestSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["requested", "approved", "rejected", "completed"], default: "requested" },
    createdAt: { type: Date, default: Date.now },
  }
);

module.exports = mongoose.model("ReturnRequest", ReturnRequestSchema);

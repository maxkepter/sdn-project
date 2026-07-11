const mongoose = require("mongoose");
const { Schema } = mongoose;

const DisputeSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["open", "under_review", "resolved", "rejected"], default: "open" },
    resolution: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dispute", DisputeSchema);

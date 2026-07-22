const mongoose = require("mongoose");
const { Schema } = mongoose;

const BusinessPolicySchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["shipping", "payment", "return"], required: true },
    description: { type: String, default: "" },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BusinessPolicy", BusinessPolicySchema);

const mongoose = require("mongoose");
const { Schema } = mongoose;

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, unique: true, sparse: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyerName: { type: String },
    buyerUsername: { type: String },
    addressId: { type: Schema.Types.ObjectId, ref: "Address", required: true },
    orderDate: { type: Date, default: Date.now },
    purchaseDate: { type: Date, default: Date.now },
    totalPrice: { type: Number, required: true, min: 0 },
    pricing: {
      itemPrice: { type: Number, default: 0 },
      quantity: { type: Number, default: 1 },
      subtotal: { type: Number, default: 0 },
      shippingCost: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },
    shippingAddress: {
      fullName: { type: String },
      phone: { type: String },
      street: { type: String },
      ward: { type: String },
      district: { type: String },
      city: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
    listingTitle: { type: String },
    listingImage: { type: String },
    customSku: { type: String },
    tracking: {
      carrier: { type: String },
      trackingNumber: { type: String },
      shippedDate: { type: Date },
      estimatedDelivery: { type: Date },
    },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    paymentDate: { type: Date },
    sellerNotes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
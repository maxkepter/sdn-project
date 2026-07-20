const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["buyer", "seller", "admin"], default: "buyer" },
    avatarURL: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);

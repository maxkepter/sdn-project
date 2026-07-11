const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { User, Category } = require("./models");

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/sdn_db";

async function seed() {
  await mongoose.connect(DATABASE_URL);
  console.log("Connected to MongoDB, seeding...");

  const cats = ["Electronics", "Fashion", "Home & Garden", "Sports", "Motors", "Collectibles", "Health & Beauty", "Industrial"];
  for (const name of cats) {
    await Category.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
  }
  console.log("Categories seeded");

  const existing = await User.findOne({ email: "seller@test.com" });
  if (!existing) {
    await User.create({
      username: "seller",
      email: "seller@test.com",
      password: "$2a$10$dummyhashedpassword",
      role: "seller",
    });
    console.log("Seller user created (seller@test.com)");
  } else {
    console.log("Seller user already exists");
  }

  console.log("Seed complete");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

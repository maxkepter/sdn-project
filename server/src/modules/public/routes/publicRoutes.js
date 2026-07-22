const express = require("express");
const router = express.Router();
const { Category, Product } = require("../../../models");

router.get("/", async (req, res, next) => {
  try {
    const cats = await Category.find().sort({ name: 1 }).lean();
    res.json(cats);
  } catch (err) {
    next(err);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const products = await Product.find({ isHidden: false })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(products);
  } catch (err) {
    next(err);
  }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("sellerId", "username firstName lastName avatarURL")
      .populate("categoryId", "name slug")
      .lean();
    if (!product || product.isHidden)
      return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

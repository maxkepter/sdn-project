const express = require("express");
const userRoutes = require("./userRoutes");
const authRoutes = require("./authRoutes");
const productRoutes = require("../../product/routes/productRoutes");
const inventoryRoutes = require("../../inventory/routes/inventoryRoutes");
const couponRoutes = require("../../coupon/routes/couponRoutes");
const publicRoutes = require("../../public/routes/publicRoutes");
const orderRoutes = require("../../order/routes/orderRoutes");
const reviewRoutes = require("../../reviews/routes/reviewRoutes");

const router = express.Router();

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/coupons", couponRoutes);
router.use("/categories", publicRoutes);
router.use("/public", publicRoutes);

router.use("/reviews", reviewRoutes);

module.exports = router;

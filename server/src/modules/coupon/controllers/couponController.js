const { Coupon, Product } = require("../../../models");

exports.getCoupons = async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).select("_id").lean();
    const productIds = products.map((p) => p._id);

    const coupons = await Coupon.find({
      $or: [{ productId: { $in: productIds } }, { productId: { $exists: false } }, { productId: null }],
    })
      .populate("productId", "title price")
      .sort({ createdAt: -1 })
      .lean();

    res.json(coupons);
  } catch (err) {
    next(err);
  }
};

exports.createCoupon = async (req, res, next) => {
  try {
    const { code, discountPercent, startDate, endDate, maxUsage, productId } = req.body;

    if (productId) {
      const product = await Product.findOne({ _id: productId, sellerId: req.user._id });
      if (!product) return res.status(404).json({ message: "Product not found" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountPercent,
      startDate,
      endDate,
      maxUsage: maxUsage || 1,
      productId: productId || undefined,
    });

    res.status(201).json(coupon);
  } catch (err) {
    next(err);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    if (coupon.productId) {
      const product = await Product.findOne({ _id: coupon.productId, sellerId: req.user._id });
      if (!product) return res.status(403).json({ message: "Not your coupon" });
    }

    await Coupon.deleteOne({ _id: coupon._id });
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    next(err);
  }
};

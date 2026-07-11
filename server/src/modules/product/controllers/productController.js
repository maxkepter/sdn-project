const { Product, Inventory, Category } = require("../../../models");

exports.getSellerProducts = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = { sellerId: req.user._id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }
    if (status === "hidden") query.isHidden = true;
    if (status === "active") query.isHidden = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("categoryId", "name")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Product.countDocuments(query),
    ]);

    const productIds = products.map((p) => p._id);
    const inventoryMap = {};
    const inventories = await Inventory.find({ productId: { $in: productIds } }).lean();
    inventories.forEach((inv) => {
      inventoryMap[inv.productId.toString()] = inv;
    });

    const result = products.map((p) => ({
      ...p,
      inventory: inventoryMap[p._id.toString()] || null,
    }));

    res.json({ products: result, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id })
      .populate("categoryId", "name")
      .lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const inventory = await Inventory.findOne({ productId: product._id }).lean();
    res.json({ ...product, inventory });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { title, description, price, categoryId, sku, quantity } = req.body;

    const images = req.files ? req.files.map((f) => "/uploads/" + f.filename) : [];

    const product = await Product.create({
      title,
      description,
      price,
      images,
      categoryId,
      sellerId: req.user._id,
      sku: sku || "",
    });

    await Inventory.create({
      productId: product._id,
      quantity: parseInt(quantity) || 0,
    });

    const populated = await Product.populate(product, { path: "categoryId", select: "name" });
    const inventory = await Inventory.findOne({ productId: product._id }).lean();

    res.status(201).json({ ...populated.toObject(), inventory });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { title, description, price, categoryId, sku } = req.body;

    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (sku !== undefined) product.sku = sku;

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((f) => "/uploads/" + f.filename);
      const existing = Array.isArray(req.body.existingImages)
        ? req.body.existingImages
        : req.body.existingImages
          ? JSON.parse(req.body.existingImages)
          : product.images;
      product.images = [...existing, ...newImages];
    }

    await product.save();
    const populated = await Product.populate(product, { path: "categoryId", select: "name" });
    const inventory = await Inventory.findOne({ productId: product._id }).lean();

    res.json({ ...populated.toObject(), inventory });
  } catch (err) {
    next(err);
  }
};

exports.toggleVisibility = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.isHidden = !product.isHidden;
    await product.save();

    res.json({ message: `Product ${product.isHidden ? "hidden" : "visible"}`, product });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    await Inventory.deleteOne({ productId: product._id });
    await Product.deleteOne({ _id: product._id });

    res.json({ message: "Product deleted" });
  } catch (err) {
    next(err);
  }
};

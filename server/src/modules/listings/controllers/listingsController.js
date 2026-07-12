const { Product, Inventory, Category, User } = require("../../../models");

exports.createListing = async (req, res, next) => {
  try {
    const {
      title, description, price, categoryId, condition,
      quantity, itemSpecifics, format, duration, shipping
    } = req.body;

    if (!title || !price) {
      return res.status(400).json({ message: "Title and price are required" });
    }

    let seller = await User.findOne({ role: "seller" });
    if (!seller) {
      seller = await User.create({
        username: "seller",
        email: "seller@test.com",
        password: "$2a$10$dummyhashedpassword",
        role: "seller",
      });
    }

    const images = req.files
      ? req.files.map((f) => "/uploads/" + f.filename)
      : [];

    let parsedSpecifics = {};
    if (itemSpecifics) {
      try {
        parsedSpecifics = typeof itemSpecifics === "string"
          ? JSON.parse(itemSpecifics)
          : itemSpecifics;
      } catch (e) {
        parsedSpecifics = {};
      }
    }

    let parsedShipping = {};
    if (shipping) {
      try {
        parsedShipping = typeof shipping === "string" ? JSON.parse(shipping) : shipping;
      } catch (e) {
        parsedShipping = {};
      }
    }

    const product = await Product.create({
      title,
      description: description || "",
      price: Number(price),
      images,
      categoryId: categoryId || null,
      sellerId: seller._id,
      condition: condition || "",
      isAuction: format === "auction",
      itemSpecifics: parsedSpecifics,
      sku: "",
    });

    await Inventory.create({
      productId: product._id,
      quantity: parseInt(quantity) || 1,
    });

    const populated = await Product.populate(product, { path: "categoryId", select: "name" });

    res.status(201).json({
      message: "Listing created successfully",
      product: populated,
    });
  } catch (err) {
    next(err);
  }
};

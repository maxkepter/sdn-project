const { Inventory, Product } = require("../../../models");

exports.getInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.find()
      .populate({
        path: "productId",
        match: { sellerId: req.user._id },
        select: "title sku price images",
      })
      .lean();

    const filtered = inventory.filter((i) => i.productId !== null);
    res.json(filtered);
  } catch (err) {
    next(err);
  }
};

exports.updateInventory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const product = await Product.findOne({ _id: productId, sellerId: req.user._id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ message: "Valid quantity required" });
    }

    const inv = await Inventory.findOneAndUpdate(
      { productId },
      { quantity, lastUpdated: new Date() },
      { new: true, upsert: true }
    );

    res.json(inv);
  } catch (err) {
    next(err);
  }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { adjustment } = req.body;

    const product = await Product.findOne({ _id: productId, sellerId: req.user._id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (adjustment === undefined) {
      return res.status(400).json({ message: "Adjustment value required" });
    }

    let inv = await Inventory.findOne({ productId });
    if (!inv) {
      inv = await Inventory.create({ productId, quantity: Math.max(0, adjustment) });
    } else {
      const newQty = inv.quantity + parseInt(adjustment);
      if (newQty < 0) {
        return res.status(400).json({
          message: "Adjustment would result in negative quantity",
          currentQuantity: inv.quantity,
        });
      }
      inv.quantity = newQty;
      inv.lastUpdated = new Date();
      await inv.save();
    }

    res.json(inv);
  } catch (err) {
    next(err);
  }
};

const Store = require("../../../models/Store");
const path = require("path");

exports.getStore = async (req, res, next) => {
  try {
    let store = await Store.findOne({ sellerId: req.user._id });
    if (!store) {
      store = await Store.create({ sellerId: req.user._id });
    }

    res.status(200).json({ success: true, store });
  } catch (error) {
    next(error);
  }
};

exports.saveDraft = async (req, res, next) => {
  try {
    const { draft } = req.body;
    const store = await Store.findOneAndUpdate(
      { sellerId: req.user._id },
      { draft, hasUnpublishedChanges: true },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, store });
  } catch (error) {
    next(error);
  }
};

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       
    .replace(/[^\w\-]+/g, '')   
    .replace(/\-\-+/g, '-');    
};

exports.publishStore = async (req, res, next) => {
  try {
    const store = await Store.findOne({ sellerId: req.user._id });
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });

    store.published = store.draft;
    store.hasUnpublishedChanges = false;
    
    // Generate slug from the store name
    if (store.published && store.published.storeName) {
      let baseSlug = slugify(store.published.storeName);
      if (!baseSlug) baseSlug = "store";
      
      // Ensure unique slug (simple check)
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await Store.findOne({ slug: uniqueSlug, _id: { $ne: store._id } });
        if (!existing) break;
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      store.slug = uniqueSlug;
    }

    await store.save();

    res.status(200).json({ success: true, store });
  } catch (error) {
    next(error);
  }
};

const { Product } = require("../../../models");

exports.getPublicStore = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const store = await Store.findOne({ slug });
      
    if (!store || !store.published) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const categories = await StoreCategory.find({ sellerId: store.sellerId });
    const listings = await Product.find({ sellerId: store.sellerId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      store: {
        ...store.published.toObject(),
        followersCount: store.followersCount,
        itemsSold: store.itemsSold,
        positiveFeedbackPercent: store.positiveFeedbackPercent
      },
      categories,
      listings
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, url: fileUrl });
  } catch (error) {
    next(error);
  }
};

const StoreCategory = require("../../../models/StoreCategory");

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await StoreCategory.find({ sellerId: req.user._id });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const categoryNumber = Math.floor(1000000000 + Math.random() * 9000000000); // 10 digit random number
    const category = await StoreCategory.create({
      sellerId: req.user._id,
      name,
      categoryNumber
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const category = await StoreCategory.findOneAndUpdate(
      { _id: req.params.id, sellerId: req.user._id },
      { name },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await StoreCategory.findOneAndDelete({ _id: req.params.id, sellerId: req.user._id });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};

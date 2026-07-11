const express = require("express");
const router = express.Router();
const { Category } = require("../../../models");

router.get("/", async (req, res, next) => {
  try {
    const cats = await Category.find().sort({ name: 1 }).lean();
    res.json(cats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

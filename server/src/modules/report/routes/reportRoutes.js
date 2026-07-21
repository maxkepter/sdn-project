const express = require("express");
const router = express.Router();
const auth = require("../../auth/middleware/auth");
const sellerCheck = require("../../auth/middleware/sellerCheck");
const ctrl = require("../controllers/reportController");

// Require Auth and Seller Role for all report routes
router.use(auth, sellerCheck);

// GET /api/v1/reports/sales
router.get("/sales", ctrl.getSalesReport);

module.exports = router;

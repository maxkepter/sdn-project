const express = require("express");
const router = express.Router();
const auth = require("../../auth/middleware/auth");
const sellerCheck = require("../../auth/middleware/sellerCheck");
const ctrl = require("../controllers/disputeController");

// Require Auth and Seller Role for all dispute routes
router.use(auth, sellerCheck);

// GET /api/v1/disputes
router.get("/", ctrl.getSellerDisputes);

// GET /api/v1/disputes/:id
router.get("/:id", ctrl.getDisputeById);

// PATCH /api/v1/disputes/:id/resolve
router.patch("/:id/resolve", ctrl.resolveDispute);

module.exports = router;

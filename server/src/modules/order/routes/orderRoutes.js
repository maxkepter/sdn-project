const express = require("express");
const router = express.Router();
const auth = require("../../auth/middleware/auth");
const sellerCheck = require("../../auth/middleware/sellerCheck");
const ctrl = require("../controllers/orderController");

router.use(auth, sellerCheck);

router.get("/", ctrl.getSellerOrders);
router.get("/stats", ctrl.getSellerStats);
router.patch("/:id/status", ctrl.updateOrderStatus);

module.exports = router;

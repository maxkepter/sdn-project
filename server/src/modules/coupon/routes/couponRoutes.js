const express = require("express");
const router = express.Router();
const auth = require("../../auth/middleware/auth");
const sellerCheck = require("../../auth/middleware/sellerCheck");
const ctrl = require("../controllers/couponController");

router.use(auth, sellerCheck);

router.get("/", ctrl.getCoupons);
router.post("/", ctrl.createCoupon);
router.delete("/:id", ctrl.deleteCoupon);

module.exports = router;

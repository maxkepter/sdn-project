const express = require("express");
const router = express.Router();
const upload = require("../../../config/upload");
const ctrl = require("../controllers/listingsController");

const authMiddleware = require("../../auth/middleware/auth");

router.post("/", upload.array("images", 24), ctrl.createListing);
router.get("/seller", authMiddleware, ctrl.getSellerListings);

module.exports = router;

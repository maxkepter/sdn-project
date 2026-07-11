const express = require("express");
const router = express.Router();
const auth = require("../../auth/middleware/auth");
const sellerCheck = require("../../auth/middleware/sellerCheck");
const upload = require("../../../config/upload");
const ctrl = require("../controllers/productController");

router.use(auth, sellerCheck);

router.get("/", ctrl.getSellerProducts);
router.get("/:id", ctrl.getProduct);
router.post("/", upload.array("images", 10), ctrl.createProduct);
router.put("/:id", upload.array("images", 10), ctrl.updateProduct);
router.patch("/:id/toggle-visibility", ctrl.toggleVisibility);
router.delete("/:id", ctrl.deleteProduct);

module.exports = router;

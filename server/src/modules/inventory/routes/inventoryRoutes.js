const express = require("express");
const router = express.Router();
const auth = require("../../auth/middleware/auth");
const sellerCheck = require("../../auth/middleware/sellerCheck");
const ctrl = require("../controllers/inventoryController");

router.use(auth, sellerCheck);

router.get("/", ctrl.getInventory);
router.put("/:productId", ctrl.updateInventory);
router.patch("/:productId/adjust", ctrl.adjustStock);

module.exports = router;

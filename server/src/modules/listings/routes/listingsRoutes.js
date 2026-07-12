const express = require("express");
const router = express.Router();
const upload = require("../../../config/upload");
const ctrl = require("../controllers/listingsController");

router.post("/", upload.array("images", 24), ctrl.createListing);

module.exports = router;

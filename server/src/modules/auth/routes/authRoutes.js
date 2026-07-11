const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");
const bypassCtrl = require("../controllers/bypassController");
const auth = require("../middleware/auth");

router.post("/login", ctrl.login);
router.post("/register", ctrl.register);
router.get("/bypass", bypassCtrl.bypassLogin);
router.get("/profile", auth, ctrl.getProfile);

module.exports = router;

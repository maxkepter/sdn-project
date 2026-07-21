const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const storeController = require("../controllers/storeController");
const authMiddleware = require("../../auth/middleware/auth");

const uploadDir = path.join(__dirname, "../../../../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "store-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG and JPG are allowed."), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 12 * 1024 * 1024 } // 12MB limit
});

router.get("/public/:slug", storeController.getPublicStore);

router.use(authMiddleware);

router.get("/", storeController.getStore);
router.put("/draft", storeController.saveDraft);
router.post("/publish", storeController.publishStore);
router.post("/upload", upload.single("image"), storeController.uploadImage);

router.get("/categories", storeController.getCategories);
router.post("/categories", storeController.createCategory);
router.put("/categories/:id", storeController.updateCategory);
router.delete("/categories/:id", storeController.deleteCategory);

module.exports = router;

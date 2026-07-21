const express = require("express");
const router = express.Router();
const auth = require("../../auth/middleware/auth");
const sellerCheck = require("../../auth/middleware/sellerCheck");
const upload = require("../../../config/upload");
const ctrl = require("../controllers/reviewController");

router.get("/products/:productId/reviews", ctrl.getProductReviews);
router.get("/sellers/:sellerId/feedback", ctrl.getSellerFeedbackAggregate);
router.post(
  "/products/:productId/reviews",
  auth,
  upload.array("photos", 5),
  ctrl.createProductReview,
);
router.use(auth, sellerCheck);
router.get("/seller/templates", ctrl.getSellerTemplates);
router.put("/seller/templates", ctrl.updateSellerTemplates);
router.get("/seller", ctrl.getSellerReviews);
router.get("/seller/statistics", ctrl.getReviewStatistics);
router.get("/seller/orders-awaiting-feedback", ctrl.getOrdersAwaitingFeedback);
router.post("/seller/:reviewId/respond", ctrl.respondToReview);
router.put("/seller/:reviewId/response", ctrl.updateReviewResponse);
router.post("/seller/:reviewId/system-response", ctrl.systemRespondToReview);
router.post("/seller/:reviewId/hide", ctrl.hideReview);
router.post("/seller/:reviewId/unhide", ctrl.unhideReview);
router.post("/seller/:reviewId/report", ctrl.reportReview);

module.exports = router;

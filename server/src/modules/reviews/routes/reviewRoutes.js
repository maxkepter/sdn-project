const express = require("express");
const router = express.Router();
const auth = require("../../auth/middleware/auth");
const sellerCheck = require("../../auth/middleware/sellerCheck");
const upload = require("../../../config/upload");
const ctrl = require("../controllers/reviewController");

// Product Review APIs
router.get("/products/:productId/reviews", ctrl.getProductReviews);
router.post(
  "/products/:productId/reviews",
  auth,
  upload.array("photos", 5),
  ctrl.createProductReview,
);
router.get(
  "/products/:productId/delivered-orders",
  auth,
  ctrl.getBuyerDeliveredOrdersForProduct,
);

// Seller Feedback APIs (Public / Buyer-facing)
router.get("/sellers/:sellerId/feedback", ctrl.getSellerFeedbackAggregate);
router.get("/sellers/:sellerId/feedback/list", ctrl.getSellerFeedbackList);
router.get(
  "/sellers/:sellerId/delivered-orders",
  auth,
  ctrl.getBuyerDeliveredOrdersForSeller,
);
router.post(
  "/sellers/:sellerId/feedback",
  auth,
  ctrl.createSellerFeedback,
);

// Seller Hub APIs
router.use(auth, sellerCheck);
router.get("/seller/templates", ctrl.getSellerTemplates);
router.put("/seller/templates", ctrl.updateSellerTemplates);
router.get("/seller", ctrl.getSellerReviews);
router.get("/seller/statistics", ctrl.getReviewStatistics);
router.get("/seller/orders-awaiting-feedback", ctrl.getOrdersAwaitingFeedback);

// Seller Product Review response/moderation actions
router.post("/seller/:reviewId/respond", ctrl.respondToReview);
router.put("/seller/:reviewId/response", ctrl.updateReviewResponse);
router.post("/seller/:reviewId/system-response", ctrl.systemRespondToReview);
router.post("/seller/:reviewId/hide", ctrl.hideReview);
router.post("/seller/:reviewId/unhide", ctrl.unhideReview);
router.post("/seller/:reviewId/report", ctrl.reportReview);

// Seller Hub Feedback actions
router.get("/seller/feedback", ctrl.getMySellerFeedback);
router.get("/seller/feedback/statistics", ctrl.getMyFeedbackStatistics);
router.post("/seller/feedback/:feedbackId/respond", ctrl.respondToFeedback);
router.post("/seller/feedback/:feedbackId/hide", ctrl.hideFeedback);
router.post("/seller/feedback/:feedbackId/unhide", ctrl.unhideFeedback);
router.post("/seller/feedback/:feedbackId/report", ctrl.reportFeedback);

module.exports = router;

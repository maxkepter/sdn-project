const mongoose = require("mongoose");
const { Dispute, Order, OrderItem, Product } = require("../../../models");

/**
 * Helper to check if a dispute belongs to a seller
 * Returns the count of seller's products in the dispute's order.
 */
async function checkSellerPermissionForOrder(orderId, sellerId) {
  const orderItems = await OrderItem.find({ orderId }).lean();
  const productIdsInOrder = orderItems.map((item) => item.productId);

  return await Product.countDocuments({
    _id: { $in: productIdsInOrder },
    sellerId: sellerId,
  });
}

/**
 * GET /api/v1/disputes
 * Lấy danh sách các khiếu nại liên quan đến các đơn hàng chứa sản phẩm của Seller
 * Supports:
 * - status: 'open' | 'under_review' | 'resolved' | 'rejected' | 'all' (default: 'all')
 * - page: Number (default: 1)
 * - limit: Number (default: 20)
 * - search: String (filters by order number)
 */
exports.getSellerDisputes = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const { status = "all", page = 1, limit = 20, search } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));

    // page/limit phải là số nguyên — trả về 400 thay vì 500 CastError.
    if (!Number.isInteger(pageNum) || !Number.isInteger(limitNum)) {
      return res.status(400).json({ message: "page/limit phải là số nguyên." });
    }

    // Validate status
    const validStatuses = ["open", "under_review", "resolved", "rejected", "all"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái khiếu nại không hợp lệ." });
    }

    // 1. Lấy tất cả Product IDs của Seller
    const products = await Product.find({ sellerId }).select("_id").lean();
    const productIds = products.map((p) => p._id);

    if (productIds.length === 0) {
      return res.json({
        disputes: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
      });
    }

    // 2. Lấy tất cả các OrderItems có chứa sản phẩm của Seller
    const orderItems = await OrderItem.find({ productId: { $in: productIds } })
      .select("orderId")
      .lean();
    let orderIds = [...new Set(orderItems.map((item) => item.orderId.toString()))];

    if (orderIds.length === 0) {
      return res.json({
        disputes: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
      });
    }

    // Apply search filter on order number if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      const matchedOrders = await Order.find({
        _id: { $in: orderIds },
        $or: [
          { orderNumber: searchRegex },
          { buyerName: searchRegex },
        ],
      })
        .select("_id")
        .lean();
      orderIds = matchedOrders.map((o) => o._id.toString());

      if (orderIds.length === 0) {
        return res.json({
          disputes: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
        });
      }
    }

    // 3. Xây dựng filter cho Dispute
    const disputeQuery = { orderId: { $in: orderIds } };
    if (status !== "all") {
      disputeQuery.status = status;
    }

    // Pagination count
    const total = await Dispute.countDocuments(disputeQuery);
    const totalPages = Math.ceil(total / limitNum);

    // Tìm các Dispute
    const disputes = await Dispute.find(disputeQuery)
      .populate({
        path: "orderId",
        select: "orderNumber orderDate totalPrice status",
      })
      .populate({
        path: "raisedBy",
        select: "username email",
      })
      .sort({ createdAt: -1 }) // Xếp khiếu nại mới nhất lên đầu
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({
      disputes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("getSellerDisputes Error:", err);
    next(err);
  }
};

/**
 * GET /api/v1/disputes/:id
 * Lấy chi tiết khiếu nại
 */
exports.getDisputeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sellerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID khiếu nại không hợp lệ." });
    }

    const dispute = await Dispute.findById(id)
      .populate({
        path: "orderId",
        select: "orderNumber orderDate totalPrice status pricing.total billingAddress shippingAddress",
      })
      .populate({
        path: "raisedBy",
        select: "username email",
      });

    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy khiếu nại." });
    }

    // Kiểm tra quyền hạn
    const sellerProductsCount = await checkSellerPermissionForOrder(dispute.orderId, sellerId);
    if (sellerProductsCount === 0) {
      return res.status(403).json({ message: "Bạn không có quyền xem khiếu nại của đơn hàng này." });
    }

    res.json(dispute);
  } catch (err) {
    console.error("getDisputeById Error:", err);
    next(err);
  }
};

/**
 * PATCH /api/v1/disputes/:id/resolve
 * Giải quyết / phản hồi khiếu nại
 * Body parameters:
 * - status: 'under_review' | 'resolved' | 'rejected'
 * - resolution: String (Lý do / cách giải quyết)
 */
exports.resolveDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    const sellerId = req.user._id;

    if (!status) {
      return res.status(400).json({ message: "Trạng thái cập nhật (status) là bắt buộc." });
    }

    const validStatuses = ["under_review", "resolved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái khiếu nại không hợp lệ để cập nhật." });
    }

    // 1. Tìm Dispute
    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy khiếu nại." });
    }

    // 2. Kiểm tra xem Dispute này có thuộc quyền quản lý của Seller không?
    const sellerProductsCount = await checkSellerPermissionForOrder(dispute.orderId, sellerId);
    if (sellerProductsCount === 0) {
      return res.status(403).json({ message: "Bạn không có quyền xử lý khiếu nại của đơn hàng này." });
    }

    // 3. Kiểm tra state machine rules
    // Terminal states cannot transition out
    if (dispute.status === "resolved" || dispute.status === "rejected") {
      return res.status(400).json({
        message: `Khiếu nại đã ở trạng thái kết thúc (${dispute.status}), không thể thay đổi thêm.`,
      });
    }

    // open -> under_review, resolved, rejected
    // under_review -> resolved, rejected
    if (dispute.status === "under_review" && status === "open") {
      return res.status(400).json({ message: "Không thể đổi trạng thái từ đang xử lý về mở." });
    }

    // Enforce resolution description when resolving/rejecting
    if (status === "resolved" || status === "rejected") {
      if (!resolution || !resolution.trim()) {
        return res.status(400).json({
          message: "Lý do giải quyết/từ chối (resolution) là bắt buộc khi kết thúc khiếu nại.",
        });
      }
      if (resolution.length > 2000) {
        return res.status(400).json({
          message: "Nội dung giải quyết vượt quá giới hạn 2000 ký tự.",
        });
      }
    }

    // 4. Cập nhật thông tin giải quyết
    dispute.status = status;
    if (resolution !== undefined) {
      dispute.resolution = resolution.trim();
    }

    await dispute.save();

    res.json({ message: "Đã cập nhật khiếu nại thành công.", dispute });
  } catch (err) {
    console.error("resolveDispute Error:", err);
    next(err);
  }
};

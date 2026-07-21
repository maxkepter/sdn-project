const mongoose = require("mongoose");
const { Dispute, Order, OrderItem, Product } = require("../../../models");

/**
 * GET /api/v1/disputes
 * Lấy danh sách các khiếu nại liên quan đến các đơn hàng chứa sản phẩm của Seller
 */
exports.getSellerDisputes = async (req, res, next) => {
  try {
    const sellerId = req.user._id;

    // 1. Lấy tất cả Product IDs của Seller
    const products = await Product.find({ sellerId }).select("_id").lean();
    const productIds = products.map((p) => p._id);

    if (productIds.length === 0) {
      return res.json([]);
    }

    // 2. Lấy tất cả các OrderItems có chứa sản phẩm của Seller
    const orderItems = await OrderItem.find({ productId: { $in: productIds } })
      .select("orderId")
      .lean();
    const orderIds = [...new Set(orderItems.map((item) => item.orderId.toString()))];

    if (orderIds.length === 0) {
      return res.json([]);
    }

    // 3. Tìm các Dispute liên quan đến các OrderIds đó
    const disputes = await Dispute.find({ orderId: { $in: orderIds } })
      .populate({
        path: "orderId",
        select: "orderDate totalPrice status",
      })
      .populate({
        path: "raisedBy",
        select: "username email",
      })
      .sort({ createdAt: -1 }) // Xếp khiếu nại mới nhất lên đầu
      .lean();

    res.json(disputes);
  } catch (err) {
    console.error("getSellerDisputes Error:", err);
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

    const validStatuses = ["open", "under_review", "resolved", "rejected"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái khiếu nại không hợp lệ." });
    }

    // 1. Tìm Dispute
    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy khiếu nại." });
    }

    // 2. Kiểm tra xem Dispute này có thuộc quyền quản lý của Seller không?
    const orderItems = await OrderItem.find({ orderId: dispute.orderId }).lean();
    const productIdsInOrder = orderItems.map((item) => item.productId);

    // Tìm xem trong Order có sản phẩm nào của Seller này không
    const sellerProductsCount = await Product.countDocuments({
      _id: { $in: productIdsInOrder },
      sellerId: sellerId,
    });

    if (sellerProductsCount === 0) {
      return res.status(403).json({ message: "Bạn không có quyền xử lý khiếu nại của đơn hàng này." });
    }

    // 3. Cập nhật thông tin giải quyết
    if (status) dispute.status = status;
    if (resolution !== undefined) dispute.resolution = resolution;

    await dispute.save();

    res.json({ message: "Đã cập nhật khiếu nại thành công.", dispute });
  } catch (err) {
    console.error("resolveDispute Error:", err);
    next(err);
  }
};

const { Order, OrderItem, Product } = require("../../../models");

exports.getSellerOrders = async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).select("_id").lean();
    const productIds = products.map((p) => p._id);

    const orderItems = await OrderItem.find({ productId: { $in: productIds } })
      .populate({
        path: "orderId",
        populate: [
          { path: "buyerId", select: "username email" },
          { path: "addressId" },
        ],
      })
      .populate("productId", "title price images")
      .sort({ createdAt: -1 })
      .lean();

    const ordersMap = {};
    orderItems.forEach((item) => {
      const order = item.orderId;
      if (!order) return;
      const oid = order._id.toString();
      if (!ordersMap[oid]) {
        ordersMap[oid] = {
          _id: order._id,
          orderDate: order.orderDate,
          totalPrice: 0,
          status: order.status,
          buyer: order.buyerId,
          address: order.addressId,
          items: [],
        };
      }
      ordersMap[oid].items.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      ordersMap[oid].totalPrice += item.quantity * item.unitPrice;
    });

    const orders = Object.values(ordersMap).sort(
      (a, b) => new Date(b.orderDate) - new Date(a.orderDate)
    );
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "paid", "shipped", "delivered", "cancelled", "returned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const orderItems = await OrderItem.find({ orderId: order._id });
    const productIds = orderItems.map((item) => item.productId);
    const sellerProducts = await Product.find({ _id: { $in: productIds }, sellerId: req.user._id });
    if (sellerProducts.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.getSellerStats = async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).select("_id").lean();
    const productIds = products.map((p) => p._id);
    const totalProducts = products.length;

    const orderItems = await OrderItem.find({ productId: { $in: productIds } })
      .populate("orderId")
      .lean();

    let totalRevenue = 0;
    const uniqueOrders = new Set();
    let awaitingShipment = 0;

    orderItems.forEach((item) => {
      if (!item.orderId) return;
      uniqueOrders.add(item.orderId._id.toString());
      if (item.orderId.status === "paid") {
        awaitingShipment++;
      }
      totalRevenue += item.quantity * item.unitPrice;
    });

    res.json({
      totalProducts,
      totalOrders: uniqueOrders.size,
      totalRevenue,
      awaitingShipment,
      unreadMessages: 52,
      sellerLevel: "Above Standard",
      recommendations: 0,
    });
  } catch (err) {
    next(err);
  }
};

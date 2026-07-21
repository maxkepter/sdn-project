const { Order, OrderItem, Product, Address, User } = require("../../../models");

// Allowed status transitions
const ALLOWED_TRANSITIONS = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

function pad(n, len = 6) {
  return String(n).padStart(len, "0");
}

async function generateOrderNumber() {
  const today = new Date();
  const ymd = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate(), 2)}`;
  const count = await Order.countDocuments({ orderNumber: new RegExp(`^ORD-${ymd}-`) });
  return `ORD-${ymd}-${pad(count + 1)}`;
}

// GET /api/v1/orders
exports.getSellerOrders = async (req, res, next) => {
  try {
    const {
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = "purchaseDate",
      sortOrder = "desc",
    } = req.query;

    const sellerProducts = await Product.find({ sellerId: req.user._id }).select("_id").lean();
    const productIds = sellerProducts.map((p) => p._id);

    const orderItems = await OrderItem.find({ productId: { $in: productIds } })
      .populate({
        path: "orderId",
        populate: [
          { path: "buyerId", select: "username email" },
          { path: "addressId" },
        ],
      })
      .populate("productId", "title price images sku")
      .sort({ createdAt: -1 })
      .lean();

    // Group by order
    const ordersMap = {};
    orderItems.forEach((item) => {
      const order = item.orderId;
      if (!order) return;
      const oid = order._id.toString();
      if (!ordersMap[oid]) {
        ordersMap[oid] = {
          _id: order._id,
          orderNumber: order.orderNumber,
          buyerId: order.buyerId,
          buyerName: order.buyerName || order.buyerId?.username || "",
          buyerUsername: order.buyerUsername || order.buyerId?.username || "",
          addressId: order.addressId,
          shippingAddress: order.shippingAddress,
          orderDate: order.orderDate,
          purchaseDate: order.purchaseDate || order.orderDate,
          paymentDate: order.paymentDate,
          paymentStatus: order.paymentStatus,
          totalPrice: 0,
          pricing: {
            itemPrice: 0,
            quantity: 0,
            subtotal: 0,
            shippingCost: order.pricing?.shippingCost || 0,
            tax: order.pricing?.tax || 0,
            total: 0,
            currency: order.pricing?.currency || "USD",
          },
          status: order.status,
          tracking: order.tracking,
          listingTitle: order.listingTitle,
          listingImage: order.listingImage,
          customSku: order.customSku,
          sellerNotes: order.sellerNotes,
          items: [],
        };
      }
      ordersMap[oid].items.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      ordersMap[oid].totalPrice += item.quantity * item.unitPrice;
      ordersMap[oid].pricing.subtotal += item.quantity * item.unitPrice;
      ordersMap[oid].pricing.quantity += item.quantity;
    });

    let orders = Object.values(ordersMap);

    // Filter
    if (status && status !== "all") {
      orders = orders.filter((o) => o.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          (o.orderNumber || "").toLowerCase().includes(q) ||
          (o.buyerName || "").toLowerCase().includes(q) ||
          (o.buyerUsername || "").toLowerCase().includes(q) ||
          (o.listingTitle || "").toLowerCase().includes(q)
      );
    }
    if (startDate) {
      const s = new Date(startDate);
      orders = orders.filter((o) => new Date(o.purchaseDate) >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      orders = orders.filter((o) => new Date(o.purchaseDate) <= e);
    }

    // Sort
    orders.sort((a, b) => {
      const av = a[sortBy] ?? a.purchaseDate;
      const bv = b[sortBy] ?? b.purchaseDate;
      if (av < bv) return sortOrder === "asc" ? -1 : 1;
      if (av > bv) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Pagination
    const total = orders.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const paged = orders.slice(skip, skip + Number(limit));

    // Fill pricing total
    paged.forEach((o) => {
      o.pricing.itemPrice = o.items[0]?.unitPrice || 0;
      o.pricing.total = o.totalPrice + (o.pricing.shippingCost || 0) + (o.pricing.tax || 0);
      o.listingImage = o.items[0]?.productId?.images?.[0] || o.listingImage;
      o.listingTitle = o.listingTitle || o.items[0]?.productId?.title;
    });

    res.json({ orders: paged, pagination: { total, page: Number(page), limit: Number(limit), totalPages } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/orders/:orderId
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("buyerId", "username email")
      .populate("addressId")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Verify seller has product in this order
    const orderItems = await OrderItem.find({ orderId: order._id }).populate("productId", "title price images sku").lean();
    const productIds = orderItems.map((i) => i.productId?._id || i.productId);
    const sellerProducts = await Product.find({ _id: { $in: productIds }, sellerId: req.user._id }).lean();
    if (sellerProducts.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Fill address snapshot if missing
    if (order.addressId && !order.shippingAddress) {
      const a = order.addressId;
      order.shippingAddress = {
        fullName: a.fullName,
        phone: a.phone,
        street: a.street,
        city: a.city,
        state: a.state,
        country: a.country,
      };
    }

    order.items = orderItems;
    order.listingImage = orderItems[0]?.productId?.images?.[0];
    order.listingTitle = order.listingTitle || orderItems[0]?.productId?.title;
    order.buyerName = order.buyerName || order.buyerId?.username;
    order.buyerUsername = order.buyerUsername || order.buyerId?.username;

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/orders/:orderId/shipping
exports.createShipping = async (req, res, next) => {
  try {
    const { carrier, trackingNumber, estimatedDelivery } = req.body;
    if (!carrier || !trackingNumber) {
      return res.status(400).json({ message: "carrier and trackingNumber are required" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Verify seller
    const orderItems = await OrderItem.find({ orderId: order._id });
    const productIds = orderItems.map((i) => i.productId);
    const sellerProducts = await Product.find({ _id: { $in: productIds }, sellerId: req.user._id });
    if (sellerProducts.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (order.status !== "paid") {
      return res.status(400).json({ message: `Cannot create shipping for order in status '${order.status}'` });
    }

    if (order.tracking?.trackingNumber) {
      return res.status(409).json({ message: "Shipping already exists" });
    }

    order.tracking = {
      carrier,
      trackingNumber,
      shippedDate: new Date(),
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
    };
    order.status = "shipped";
    await order.save();

    res.status(201).json({ message: "Shipping created", order });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/orders/:orderId/status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, sellerNotes } = req.body;
    const validStatuses = ["pending", "paid", "shipped", "delivered", "cancelled", "returned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const orderItems = await OrderItem.find({ orderId: order._id });
    const productIds = orderItems.map((item) => item.productId);
    const sellerProducts = await Product.find({ _id: { $in: productIds }, sellerId: req.user._id });
    if (sellerProducts.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from '${order.status}' to '${status}'. Allowed: [${allowed.join(", ")}]`,
      });
    }

    order.status = status;
    if (sellerNotes !== undefined) order.sellerNotes = sellerNotes;
    if (status === "delivered" && order.tracking) order.tracking.estimatedDelivery = order.tracking.estimatedDelivery;
    if (status === "returned" && order.tracking) {
      // Mark tracking as failed (best-effort, status enum doesn't include 'failed' for tracking — leave carrier)
    }
    await order.save();

    res.json({ message: "Status updated", order });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/orders/stats
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
      if (item.orderId.status === "paid") awaitingShipment++;
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

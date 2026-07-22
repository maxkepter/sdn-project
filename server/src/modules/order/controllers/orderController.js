const { Order, OrderItem, Product } = require("../../../models");

// Status flow mirroring seller-ebay order lifecycle.
const ALLOWED_TRANSITIONS = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

const VALID_STATUSES = Object.keys(ALLOWED_TRANSITIONS);

function pad(n, len = 6) {
  return String(n).padStart(len, "0");
}

function ymd(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}`;
}

async function generateOrderNumber() {
  const today = new Date();
  const prefix = `ORD-${ymd(today)}-`;
  const count = await Order.countDocuments({ orderNumber: new RegExp(`^${prefix}`) });
  return `${prefix}${pad(count + 1)}`;
}

// Resolve which orderIds belong to this seller (via their products).
async function getSellerOrderIds(sellerId) {
  const products = await Product.find({ sellerId }).select("_id").lean();
  const productIds = products.map((p) => p._id);
  if (!productIds.length) return { orderIds: [], productIds };
  const items = await OrderItem.find({ productId: { $in: productIds } })
    .select("orderId")
    .lean();
  const orderIds = [...new Set(items.map((i) => i.orderId.toString()))];
  return { orderIds, productIds };
}

function buildBaseQuery({ status, startDate, endDate, search }) {
  const query = {};
  if (status && status !== "all") query.status = status;

  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.purchaseDate.$lte = end;
    }
  }

  if (search && search.trim()) {
    const re = { $regex: search.trim(), $options: "i" };
    query.$or = [{ buyerUsername: re }, { buyerName: re }, { orderNumber: re }];
  }
  return query;
}

function buildSort(sortBy, sortOrder) {
  const dir = sortOrder === "asc" ? 1 : -1;
  if (sortBy === "total") return { "pricing.total": dir };
  return { [sortBy]: dir };
}

function parsePagination(query) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function enrichOrdersWithItems(orders, orderItems) {
  const itemsByOrder = new Map();
  for (const item of orderItems) {
    const oid = item.orderId.toString();
    if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
    itemsByOrder.get(oid).push(item);
  }
  return orders.map((o) => {
    const items = itemsByOrder.get(o._id.toString()) || [];
    const firstItem = items[0];
    return {
      ...o,
      items,
      listingImage: o.listingImage || firstItem?.productId?.images?.[0],
      listingTitle: o.listingTitle || firstItem?.productId?.title,
    };
  });
}

// GET /api/v1/orders
exports.getSellerOrders = async (req, res, next) => {
  try {
    const { orderIds } = await getSellerOrderIds(req.user._id);
    if (!orderIds.length) {
      return res.json({ orders: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } });
    }

    const baseQuery = buildBaseQuery(req.query);
    const filter = { _id: { $in: orderIds }, ...baseQuery };

    const { page, limit, skip } = parsePagination(req.query);
    const sort = buildSort(req.query.sortBy, req.query.sortOrder);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("buyerId", "username email firstName lastName")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const items = await OrderItem.find({ orderId: { $in: orders.map((o) => o._id) } })
      .populate("productId", "title price images sku")
      .lean();

    const enriched = enrichOrdersWithItems(orders, items);

    res.json({
      orders: enriched,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/orders/stats
exports.getSellerStats = async (req, res, next) => {
  try {
    const { orderIds } = await getSellerOrderIds(req.user._id);
    if (!orderIds.length) {
      return res.json({
        totalOrders: 0,
        totalRevenue: 0,
        awaitingShipment: 0,
        statusBreakdown: [],
      });
    }

    const stats = await Order.aggregate([
      { $match: { _id: { $in: orderIds } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$pricing.total" },
        },
      },
    ]);

    const totalOrders = orderIds.length;
    const awaitingShipment = stats.find((s) => s._id === "paid")?.count || 0;
    const totalRevenue = stats
      .filter((s) => s._id !== "pending" && s._id !== "cancelled")
      .reduce((sum, s) => sum + (s.totalRevenue || 0), 0);

    res.json({ totalOrders, totalRevenue, awaitingShipment, statusBreakdown: stats });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/orders/:orderId
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("buyerId", "username email firstName lastName")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    const items = await OrderItem.find({ orderId: order._id })
      .populate("productId", "title price images sku")
      .lean();

    // Verify seller has at least one product in this order
    const productIds = items.map((i) => i.productId?._id).filter(Boolean);
    const owned = await Product.countDocuments({
      _id: { $in: productIds },
      sellerId: req.user._id,
    });
    if (!owned) return res.status(403).json({ message: "Access denied" });

    res.json(enrichOrdersWithItems([order], items)[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/orders  — create (used by demos / tests)
exports.createOrder = async (req, res, next) => {
  try {
    const { buyerId, productId, quantity = 1, shippingAddress } = req.body;
    if (!buyerId || !productId) {
      return res.status(400).json({ message: "buyerId and productId are required" });
    }

    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your product" });
    }

    const qty = Math.max(parseInt(quantity) || 1, 1);
    const subtotal = product.price * qty;
    const total = subtotal; // no shipping/tax at create time

    const order = await Order.create({
      orderNumber: await generateOrderNumber(),
      buyerId,
      buyerName: req.body.buyerName || "",
      buyerUsername: req.body.buyerUsername || "",
      addressId: req.body.addressId || undefined,
      purchaseDate: new Date(),
      totalPrice: total,
      pricing: { itemPrice: product.price, quantity: qty, subtotal, total, currency: "USD" },
      shippingAddress: shippingAddress || undefined,
      listingTitle: product.title,
      listingImage: product.images?.[0],
      status: "pending",
      paymentStatus: "pending",
    });

    await OrderItem.create({ orderId: order._id, productId: product._id, quantity: qty, unitPrice: product.price });

    res.status(201).json({ message: "Order created", order });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/orders/:orderId/status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, tracking, sellerNotes } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status", valid: VALID_STATUSES });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const items = await OrderItem.find({ orderId: order._id });
    const owned = await Product.countDocuments({
      _id: { $in: items.map((i) => i.productId) },
      sellerId: req.user._id,
    });
    if (!owned) return res.status(403).json({ message: "Access denied" });

    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ message: `Cannot transition from '${order.status}' to '${status}'.`, allowed });
    }

    order.status = status;
    if (status === "delivered") {
      order.paymentStatus = "paid";
      if (!order.paymentDate) order.paymentDate = new Date();
      if (!order.deliveredDate) order.deliveredDate = new Date();
    }
    if (status === "shipped" && order.tracking && !order.tracking.shippedDate) {
      order.tracking.shippedDate = new Date();
    }
    if (tracking) order.tracking = { ...order.tracking, ...tracking };
    if (sellerNotes !== undefined) order.sellerNotes = sellerNotes;

    await order.save();
    res.json({ message: "Status updated", order });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/orders/:orderId/shipping
exports.addTracking = async (req, res, next) => {
  try {
    const { carrier, trackingNumber, estimatedDelivery } = req.body;
    if (!carrier || !trackingNumber) {
      return res.status(400).json({ message: "carrier and trackingNumber are required" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const items = await OrderItem.find({ orderId: order._id });
    const owned = await Product.countDocuments({
      _id: { $in: items.map((i) => i.productId) },
      sellerId: req.user._id,
    });
    if (!owned) return res.status(403).json({ message: "Access denied" });

    if (order.status !== "paid") {
      return res.status(400).json({ message: `Cannot ship order in status '${order.status}'` });
    }

    order.tracking = {
      ...order.tracking,
      carrier,
      trackingNumber,
      shippedDate: new Date(),
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
    };
    order.status = "shipped";
    await order.save();

    res.status(201).json({ message: "Tracking added", order });
  } catch (err) {
    next(err);
  }
};
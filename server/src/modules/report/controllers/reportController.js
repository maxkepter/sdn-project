const mongoose = require("mongoose");
const { OrderItem, Product } = require("../../../models");

/**
 * GET /api/v1/reports/sales
 * Query params:
 * - timeframe: 'week' | 'month' (default: 'month')
 * - startDate: ISO Date string (optional)
 * - endDate: ISO Date string (optional)
 */
exports.getSalesReport = async (req, res, next) => {
  try {
    const { timeframe = "month", startDate, endDate } = req.query;
    const sellerId = req.user._id;

    // 1. Find all product IDs belonging to the seller
    const products = await Product.find({ sellerId }).select("_id").lean();
    const productIds = products.map((p) => p._id);

    if (productIds.length === 0) {
      return res.json({ data: [] });
    }

    // 2. Define the date format for grouping based on timeframe
    // For Month: 2026-07
    // For Week: 2026-W29 (ISO Week)
    const format = timeframe === "week" ? "%Y-W%V" : "%Y-%m";

    // 3. Match filters for Order
    // Exclude cancelled/returned/pending orders to only count real revenue
    const validStatuses = ["paid", "shipped", "delivered"];
    const orderMatchCondition = {
      "orderDoc.status": { $in: validStatuses },
    };

    // Filter by Date Range if provided
    if (startDate || endDate) {
      orderMatchCondition["orderDoc.orderDate"] = {};
      if (startDate) orderMatchCondition["orderDoc.orderDate"].$gte = new Date(startDate);
      if (endDate) orderMatchCondition["orderDoc.orderDate"].$lte = new Date(endDate);
    }

    // 4. Aggregation Pipeline
    const pipeline = [
      // Stage 1: Get OrderItems of this seller's products
      {
        $match: {
          productId: { $in: productIds },
        },
      },
      // Stage 2: Join with Order collection
      {
        $lookup: {
          from: "orders", // Assuming mongoose collection name is 'orders'
          localField: "orderId",
          foreignField: "_id",
          as: "orderDoc",
        },
      },
      // Stage 3: Flatten order array
      {
        $unwind: "$orderDoc",
      },
      // Stage 4: Filter valid orders & within date range
      {
        $match: orderMatchCondition,
      },
      // Stage 5: Group by the formatted date string
      {
        $group: {
          _id: {
            $dateToString: { format: format, date: "$orderDoc.orderDate" },
          },
          totalRevenue: {
            $sum: { $multiply: ["$quantity", "$unitPrice"] },
          },
          // We use $addToSet to get unique order IDs (count unique orders, not just items)
          uniqueOrders: { $addToSet: "$orderId" },
        },
      },
      // Stage 6: Project the final format and count array length for uniqueOrders
      {
        $project: {
          _id: 0,
          period: "$_id",
          totalRevenue: 1,
          totalOrders: { $size: "$uniqueOrders" },
        },
      },
      // Stage 7: Sort chronologically
      {
        $sort: { period: 1 },
      },
    ];

    const reportData = await OrderItem.aggregate(pipeline);

    res.json({
      timeframe,
      data: reportData,
    });
  } catch (err) {
    console.error("SalesReport Error:", err);
    next(err);
  }
};

const { OrderItem, Order, Product } = require("../../../models");

// Revenue status policy: paid/shipped/delivered count toward revenue.
// pending/cancelled/returned are excluded.
const REVENUE_STATUSES = ["paid", "shipped", "delivered"];
// Refund policy: orders returned OR payment refunded.
const REFUND_STATUSES = ["returned"];
const REFUND_PAYMENT_STATUSES = ["refunded"];

const TIMEFRAMES = new Set(["week", "month"]);

function parseDate(value, fieldName) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const err = new Error(`Invalid ${fieldName} — expected ISO date string.`);
    err.statusCode = 400;
    throw err;
  }
  return d;
}

function validateReportQuery(query) {
  const { timeframe = "month", startDate, endDate } = query;

  if (!TIMEFRAMES.has(timeframe)) {
    const err = new Error("timeframe must be 'week' or 'month'.");
    err.statusCode = 400;
    throw err;
  }

  let start = null;
  let end = null;

  if (startDate) {
    start = parseDate(startDate, "startDate");
  }
  if (endDate) {
    end = parseDate(endDate, "endDate");
  }
  if (start && end && start > end) {
    const err = new Error("startDate must be on or before endDate.");
    err.statusCode = 400;
    throw err;
  }
  if (start && end) {
    const days = (end - start) / (1000 * 60 * 60 * 24);
    if (days > 366) {
      const err = new Error("Date range cannot exceed 366 days.");
      err.statusCode = 400;
      throw err;
    }
  }

  return { timeframe, start, end };
}

// Returns ISO date string for a Date in UTC (yyyy-MM-dd or yyyy-Www).
function dateToISO(date) {
  return date.toISOString();
}

// Compute bucket key from a date and timeframe.
function dateToBucketKey(date, timeframe) {
  if (timeframe === "week") {
    // ISO week: yyyy-Www
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    // Thursday in current week decides the year (per ISO-8601)
    const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const diff = (d - firstThursday) / (24 * 60 * 60 * 1000);
    const week = 1 + Math.floor(diff / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  // month
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Compute the start instant for a given bucket key, plus the next bucket start.
function bucketRange(bucketKey, timeframe) {
  if (timeframe === "week") {
    const [yearStr, weekStr] = bucketKey.split("-W");
    const year = Number(yearStr);
    const week = Number(weekStr);
    // ISO week 1: week containing 4th January.
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = (jan4.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
    const start = new Date(week1Monday);
    start.setUTCDate(start.getUTCDate() + (week - 1) * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }
  // month
  const [yearStr, monthStr] = bucketKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

// Fill in zero rows for every bucket between min & max.
function fillZeroBuckets(rows, timeframe, fallbackFrom, fallbackTo) {
  if (!rows.length) {
    return rows;
  }
  const buckets = rows.map((r) => r.period);
  const sorted = [...buckets].sort();
  // Build a quick lookup
  const byKey = Object.fromEntries(rows.map((r) => [r.period, r]));

  // Use fallbackFrom/fallbackTo if explicit; otherwise span the entire bucket range.
  let startBucket, endBucket;
  if (fallbackFrom && fallbackTo) {
    startBucket = dateToBucketKey(new Date(fallbackFrom), timeframe);
    endBucket = dateToBucketKey(new Date(fallbackTo), timeframe);
  } else {
    startBucket = sorted[0];
    endBucket = sorted[sorted.length - 1];
  }

  const result = [];
  // Walk bucket-by-bucket.
  let cur = bucketRange(startBucket, timeframe).start;
  const last = bucketRange(endBucket, timeframe).end;
  while (cur < last) {
    const key = dateToBucketKey(cur, timeframe);
    if (byKey[key]) {
      result.push(byKey[key]);
    } else {
      result.push({
        period: key,
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        refunds: 0,
      });
    }
    cur = bucketRange(key, timeframe).end;
  }
  return result;
}

// Build the aggregation pipeline that buckets revenue rows per period.
// Note: we keep the *raw* pipeline and let zero-fill normalize the response,
// so we can include refund counts per bucket as well.
function buildSalesAggregation({ productIds, start, end, timeframe, validStatuses }) {
  const format = timeframe === "week" ? "%Y-W%V" : "%Y-%m";
  const orderMatch = { "orderDoc.status": { $in: validStatuses } };
  if (start || end) {
    orderMatch["orderDoc.orderDate"] = {};
    if (start) orderMatch["orderDoc.orderDate"].$gte = new Date(start);
    if (end) orderMatch["orderDoc.orderDate"].$lte = new Date(end);
  }

  const refundStatuses = REFUND_STATUSES;
  const refundPaymentStatuses = REFUND_PAYMENT_STATUSES;

  const refundCondition = {
    $or: [
      { "orderDoc.status": { $in: refundStatuses } },
      { "orderDoc.paymentStatus": { $in: refundPaymentStatuses } },
    ],
  };

  return [
    { $match: { productId: { $in: productIds } } },
    {
      $lookup: {
        from: "orders",
        localField: "orderId",
        foreignField: "_id",
        as: "orderDoc",
      },
    },
    { $unwind: "$orderDoc" },
    // We accept refunded/returned orders in this stage to compute refund metric,
    // but exclude them from revenue via the conditional sums below.
    {
      $match: {
        $or: [
          { "orderDoc.status": { $in: validStatuses } },
          refundCondition,
        ],
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format, date: "$orderDoc.orderDate" },
        },
        totalRevenue: {
          $sum: {
            $cond: [
              { $in: ["$orderDoc.status", validStatuses] },
              { $multiply: ["$quantity", "$unitPrice"] },
              0,
            ],
          },
        },
        refunds: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $in: ["$orderDoc.status", refundStatuses] },
                  { $in: ["$orderDoc.paymentStatus", refundPaymentStatuses] },
                ],
              },
              { $multiply: ["$quantity", "$unitPrice"] },
              0,
            ],
          },
        },
        uniqueOrders: { $addToSet: "$orderId" },
      },
    },
    {
      $project: {
        _id: 0,
        period: "$_id",
        totalRevenue: 1,
        totalOrders: { $size: "$uniqueOrders" },
        refunds: 1,
        averageOrderValue: {
          $cond: [
            { $gt: [{ $size: "$uniqueOrders" }, 0] },
            { $divide: ["$totalRevenue", { $size: "$uniqueOrders" }] },
            0,
          ],
        },
      },
    },
    { $sort: { period: 1 } },
  ];
}

// GET /api/v1/reports/sales
exports.getSalesReport = async (req, res, next) => {
  try {
    const { timeframe, start, end } = validateReportQuery(req.query);
    const sellerId = req.user._id;

    const products = await Product.find({ sellerId }).select("_id").lean();
    const productIds = products.map((p) => p._id);

    const from = start ? start.toISOString() : null;
    const to = end ? end.toISOString() : null;

    if (productIds.length === 0) {
      return res.json({
        timeframe,
        from,
        to,
        currency: "USD",
        summary: {
          revenue: 0,
          orderCount: 0,
          averageOrderValue: 0,
          refunds: 0,
        },
        data: [],
      });
    }

    const rows = await OrderItem.aggregate(
      buildSalesAggregation({
        productIds,
        start,
        end,
        timeframe,
        validStatuses: REVENUE_STATUSES,
      })
    );

    const filled = fillZeroBuckets(rows, timeframe, start, end);

    // Map data points to plan-expected shape: revenue / orderCount / refunds.
    const data = filled.map((r) => ({
      period: r.period,
      revenue: Number(r.totalRevenue) || 0,
      orderCount: Number(r.totalOrders) || 0,
      averageOrderValue: Number(r.averageOrderValue) || 0,
      refunds: Number(r.refunds) || 0,
    }));

    const summary = data.reduce(
      (acc, r) => {
        acc.revenue += r.revenue;
        acc.orderCount += r.orderCount;
        acc.refunds += r.refunds;
        return acc;
      },
      { revenue: 0, orderCount: 0, refunds: 0 }
    );
    summary.averageOrderValue =
      summary.orderCount > 0 ? summary.revenue / summary.orderCount : 0;

    res.json({
      timeframe,
      from,
      to,
      currency: "USD",
      summary,
      data,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error("SalesReport Error:", err);
    next(err);
  }
};

// GET /api/v1/reports/sales.csv
// CSV export of the same dataset. Server-authoritative, so it preserves the
// bucket keys the UI shows.
exports.exportSalesReportCsv = async (req, res, next) => {
  try {
    const { timeframe, start, end } = validateReportQuery(req.query);
    const sellerId = req.user._id;

    const products = await Product.find({ sellerId }).select("_id").lean();
    const productIds = products.map((p) => p._id);

    let rows = [];
    if (productIds.length > 0) {
      const agg = await OrderItem.aggregate(
        buildSalesAggregation({
          productIds,
          start,
          end,
          timeframe,
          validStatuses: REVENUE_STATUSES,
        })
      );
      rows = fillZeroBuckets(agg, timeframe, start, end);
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const today = new Date().toISOString().slice(0, 10);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales-report-${today}.csv"`
    );

    const header = ["period", "totalRevenue", "totalOrders", "averageOrderValue", "refunds"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push(
        [
          r.period,
          (Number(r.totalRevenue) || 0).toFixed(2),
          Number(r.totalOrders) || 0,
          (Number(r.averageOrderValue) || 0).toFixed(2),
          (Number(r.refunds) || 0).toFixed(2),
        ].join(",")
      );
    });
    res.send(lines.join("\n"));
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error("SalesReport CSV Error:", err);
    next(err);
  }
};

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function SellerOverview() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);

  useEffect(() => {
    apiClient.get("/orders/stats").then((r) => setStats(r.data)).catch(() => {});
    apiClient
      .get("/orders")
      .then((r) => setOrders(Array.isArray(r.data?.orders) ? r.data.orders : []))
      .catch(() => {});
    apiClient
      .get("/reviews/seller/feedback/statistics")
      .then((r) => setFeedbackStats(r.data))
      .catch(() => {});
  }, []);

  const awaiting = orders.filter((o) => o.status === "paid");

  return (
    <div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-3 text-sm text-yellow-800 mb-6">
        <strong className="font-semibold">A new listing experience is here!</strong>{" "}
        List faster, upload videos, use new photo editing tools, and more.{" "}
        <button type="button" className="text-blue-600 hover:underline font-medium bg-transparent border-none p-0 cursor-pointer">Learn more</button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Unread messages"
          value={stats?.unreadMessages ?? "-"}
          link="/seller/orders"
        />
        <StatCard
          label="Awaiting shipment"
          value={stats?.awaitingShipment ?? "-"}
          link="/seller/orders"
        />
        <StatCard
          label="Sales (31 days)"
          value={stats ? `$${stats.totalRevenue.toFixed(2)}` : "-"}
          link="/seller/reports"
        />
        <StatCard
          label="Seller level forecast"
          value={stats?.sellerLevel ?? "-"}
          link="/seller/performance"
        />
        <StatCard
          label="Research recommendations"
          value={stats?.recommendations ?? "-"}
          link="/seller/research"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-base font-bold text-gray-800 mb-3">Tasks</h3>
          <ul className="space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">You must select a return period which is supported</span>
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">4</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Print labels and ship</span>
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">{stats?.awaitingShipment ?? 0}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Upload tracking for pending orders</span>
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">2</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Review seller dashboard recommendations</span>
              <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">{stats?.recommendations ?? 0}</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-800">Sales</h3>
            <Link to="/seller/reports" className="text-xs text-blue-600 hover:underline">See reports</Link>
          </div>
          <SalesChart orders={orders} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-800">Orders</h3>
            <Link to="/seller/orders" className="text-xs text-blue-600 hover:underline">See all</Link>
          </div>
          {awaiting.length === 0 ? (
            <p className="text-sm text-gray-500">No orders awaiting shipment.</p>
          ) : (
            <ul className="space-y-2">
              {awaiting.slice(0, 4).map((o) => (
                <li key={o._id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span className="text-gray-600 truncate">
                      Order #{o._id.slice(-6).toUpperCase()}
                    </span>
                    <span className="font-semibold text-gray-800">${o.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full capitalize">{o.status}</span>
                    <span className="text-xs text-gray-400">{new Date(o.orderDate).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-800">Feedback</h3>
            <Link to="/seller/feedback" className="text-xs text-blue-600 hover:underline">See details</Link>
          </div>
          <div className="flex flex-col gap-3 py-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium text-green-600">🟢 Positive</span>
              <span className="font-bold">{feedbackStats?.positiveCount ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600">🟡 Neutral</span>
              <span className="font-bold">{feedbackStats?.neutralCount ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-red-600">🔴 Negative</span>
              <span className="font-bold">{feedbackStats?.negativeCount ?? 0}</span>
            </div>
            <div className="border-t pt-2 mt-1 flex justify-between items-center font-semibold">
              <span>Positive Rate</span>
              <span className="text-blue-600">{feedbackStats?.positiveRate != null ? `${feedbackStats.positiveRate}%` : "0%"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, link }) {
  return (
    <Link
      to={link}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition"
    >
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </Link>
  );
}

function SalesChart({ orders }) {
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        No sales data yet
      </div>
    );
  }

  const dayTotals = {};
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayTotals[key] = 0;
  }

  orders.forEach((order) => {
    if (!order.orderDate) return;
    const key = new Date(order.orderDate).toISOString().slice(0, 10);
    if (dayTotals[key] !== undefined) {
      dayTotals[key] += order.totalPrice;
    }
  });

  const values = Object.values(dayTotals);
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-[2px] h-32">
      {values.map((v, i) => {
        const pct = (v / max) * 100;
        return (
          <div
            key={i}
            title={`$${v.toFixed(2)}`}
            className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition cursor-pointer"
            style={{ height: `${Math.max(pct, 2)}%` }}
          />
        );
      })}
    </div>
  );
}

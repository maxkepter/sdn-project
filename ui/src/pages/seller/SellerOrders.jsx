import { useState, useEffect, useCallback } from "react";
import apiClient from "../../services/apiClient";

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiClient.get("/orders");
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatus = async (id, status) => {
    try {
      await apiClient.patch(`/orders/${id}/status`, { status });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || "Error updating status");
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Orders</h2>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Order ID</th>
                <th className="text-left p-3">Buyer</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Items</th>
                <th className="text-left p-3">Total</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">#{o._id.slice(-8).toUpperCase()}</td>
                  <td className="p-3">{o.buyer?.username || o.buyer?.email || "N/A"}</td>
                  <td className="p-3 text-xs">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="p-3">{o.items.length} item(s)</td>
                  <td className="p-3 font-semibold">${o.totalPrice.toFixed(2)}</td>
                  <td className="p-3">
                    <select
                      value={o.status}
                      onChange={(e) => handleStatus(o._id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                        o.status === "delivered" ? "bg-green-100 text-green-700" :
                        o.status === "shipped" ? "bg-blue-100 text-blue-700" :
                        o.status === "paid" ? "bg-orange-100 text-orange-700" :
                        o.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="returned">Returned</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

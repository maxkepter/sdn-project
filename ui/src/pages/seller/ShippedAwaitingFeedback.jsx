import React, { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function ShippedAwaitingFeedback() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get("/reviews/seller/orders-awaiting-feedback")
      .then((response) => setOrders(response.data || []))
      .catch((err) => setError(err.response?.data?.message || "Unable to load orders"));
  }, []);

  const formatDate = (date) => {
    if (!date) return "—";
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
  };

  const buyerName = (buyer) => {
    if (!buyer) return "Unknown";
    const parts = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ");
    return parts || buyer.username || "Unknown";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Shipped, Awaiting Feedback</h1>
      <p className="text-gray-600 mb-6">
        Delivered orders waiting for buyer reviews.
      </p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {orders.length === 0 ? (
          <p className="p-6 text-gray-500 text-center">
            No delivered orders found.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Buyer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivered Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Has review
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.orderNumber || order._id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {buyerName(order.buyer)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(order.deliveredDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.hasReview ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        Awaiting
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
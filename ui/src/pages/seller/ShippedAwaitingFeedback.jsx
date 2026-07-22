import React, { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import MainLayout from "../../layout/MainLayout";
import SellerHeader from "./SellerHeader";

export default function ShippedAwaitingFeedback() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await apiClient.get(
          "/reviews/seller/orders-awaiting-feedback",
        );
        if (!cancelled) setOrders(response.data || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load orders",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (date) => {
    if (!date) return "—";
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime())
      ? "—"
      : parsed.toLocaleDateString();
  };

  const buyerName = (buyer) => {
    if (!buyer) return "Unknown";
    const parts = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ");
    return parts || buyer.username || "Unknown";
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <SellerHeader />
        <h1 className="text-3xl font-bold mt-6 mb-2">
          Delivered Orders Awaiting Seller Feedback
        </h1>
        <p className="text-gray-600 mb-6">
          Delivered orders awaiting buyer feedback.
        </p>

        {error && (
          <p className="mb-4 p-3 rounded bg-red-50 border border-red-300 text-red-700 text-sm">
            {error}
          </p>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3">Loading delivered orders...</p>
          </div>
        ) : (
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
                      Has feedback
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
                        {order.hasFeedback ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            Feedback Left
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            Awaiting Feedback
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
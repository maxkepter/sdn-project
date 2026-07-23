import React, { useEffect, useState } from "react";
import apiClient from "../services/apiClient";
import { useAuth } from "../hooks/useAuth";

const MAX_COMMENT_LENGTH = 2000;

export default function LeaveSellerFeedbackModal({ sellerId, storeName, storeLogo, onClose, onCreated }) {
  const { user } = useAuth();
  const [rating, setRating] = useState("positive");
  const [comment, setComment] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedOrder = orders.find(o => o._id === orderId);

  useEffect(() => {
    if (!user || !sellerId) return;
    let cancelled = false;
    const loadOrders = async () => {
      setLoadingOrders(true);
      setError("");
      try {
        const response = await apiClient.get(
          `/reviews/sellers/${sellerId}/delivered-orders`
        );
        if (cancelled) return;
        setOrders(response.data || []);
        if (response.data && response.data.length > 0) {
          setOrderId(response.data[0]._id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load delivered orders"
          );
        }
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    };
    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [sellerId, user]);

  const submit = async (event) => {
    event.preventDefault();
    if (!user) {
      setError("Login is required to leave feedback.");
      return;
    }
    if (!orderId) {
      setError("Please select the order this feedback is for.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const response = await apiClient.post(
        `/reviews/sellers/${sellerId}/feedback`,
        { orderId, rating, comment }
      );
      onCreated?.(response.data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    Boolean(user) &&
    Boolean(orderId) &&
    !submitting &&
    !loadingOrders &&
    orders.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form
        onSubmit={submit}
        className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold mb-4">Leave Seller Feedback</h2>
        {!user && (
          <p className="mb-3 p-2 rounded bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm">
            Please log in to leave feedback.
          </p>
        )}
        {error && (
          <p className="mb-3 p-2 rounded bg-red-50 border border-red-300 text-red-700 text-sm">
            {error}
          </p>
        )}

        {/* Store header */}
        {(storeName || storeLogo) && (
          <div className="flex items-center gap-3 p-3 mb-4 bg-gray-50 rounded-lg border border-gray-200">
            {storeLogo ? (
              <img src={storeLogo} alt={storeName || "Store"} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">Logo</div>
            )}
            <div>
              <div className="text-xs text-gray-500">Selling from</div>
              <div className="font-semibold text-gray-900">{storeName || "Store"}</div>
            </div>
          </div>
        )}

        <label className="block text-sm font-medium mb-2">How was your transaction?</label>
        <div className="flex gap-4 mb-4">
          {[
            { value: "positive", label: "Positive", color: "text-green-600 border-green-500 bg-green-50" },
            { value: "neutral", label: "Neutral", color: "text-gray-600 border-gray-500 bg-gray-50" },
            { value: "negative", label: "Negative", color: "text-red-600 border-red-500 bg-red-50" }
          ].map((item) => (
            <label
              key={item.value}
              className={`flex-1 flex flex-col items-center p-3 border rounded-lg cursor-pointer transition ${
                rating === item.value
                  ? `${item.color} font-bold ring-2 ring-blue-500`
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="rating"
                value={item.value}
                checked={rating === item.value}
                onChange={() => setRating(item.value)}
                className="sr-only"
              />
              <span className="text-lg">
                {item.value === "positive" ? "🟢" : item.value === "neutral" ? "🟡" : "🔴"}
              </span>
              <span className="text-sm mt-1">{item.label}</span>
            </label>
          ))}
        </div>

        <label className="block text-sm font-medium mb-1">Select Order</label>
        {loadingOrders ? (
          <p className="text-sm text-gray-500 mb-4">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-red-500 mb-4 font-semibold">
            You have no delivered orders from this store that are eligible for feedback.
          </p>
        ) : (
          <>
            <select
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 bg-white"
              required
            >
              {orders.map((order) => (
                <option key={order._id} value={order._id}>
                  {order.orderNumber || order._id} —{" "}
                  {order.deliveredDate
                    ? new Date(order.deliveredDate).toLocaleDateString()
                    : "Delivered"}
                </option>
              ))}
            </select>

            {/* Items in the selected order */}
            {selectedOrder?.items?.length > 0 && (
              <div className="mb-4 border rounded-lg bg-gray-50 p-3 max-h-40 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Items in this order
                </div>
                <ul className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <li key={item._id} className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={
                            typeof item.image === "string" && item.image.startsWith("http")
                              ? item.image
                              : `http://localhost:5000${item.image}`
                          }
                          alt={item.title}
                          className="w-10 h-10 object-cover rounded border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          No image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <label className="block text-sm font-medium mb-1">Tell us more (comment)</label>
        <textarea
          required
          value={comment}
          onChange={(event) =>
            setComment(event.target.value.slice(0, MAX_COMMENT_LENGTH))
          }
          maxLength={MAX_COMMENT_LENGTH}
          rows={4}
          placeholder="Write a brief comment about your experience with this seller"
          className="w-full border rounded px-3 py-2 mb-2"
        />
        <div className="text-xs text-gray-500 mb-4">
          {comment.length} / {MAX_COMMENT_LENGTH} characters
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700 font-semibold"
          >
            {submitting ? "Submitting..." : "Leave Feedback"}
          </button>
        </div>
      </form>
    </div>
  );
}

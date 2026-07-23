import React, { useEffect, useState } from "react";
import apiClient from "../services/apiClient";
import { useAuth } from "../hooks/useAuth";
import { resolveImageUrl } from "../utils/image";

const MAX_COMMENT_LENGTH = 5000;
const MAX_TITLE_LENGTH = 200;
const MAX_PHOTOS = 5;

export default function LeaveReviewModal({ productId, productName, productImage, onClose, onCreated }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      // Clean up object URLs to avoid memory leaks
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadOrders = async () => {
      setLoadingOrders(true);
      setError("");
      try {
        const response = await apiClient.get(
          `/reviews/products/${productId}/delivered-orders`,
        );
        if (cancelled) return;
        setOrders(response.data || []);
        if (response.data && response.data.length > 0) {
          setOrderId(response.data[0]._id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load delivered orders",
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
  }, [productId, user]);

  const handlePhotosChange = (event) => {
    const files = Array.from(event.target.files || []).slice(0, MAX_PHOTOS);
    setPhotos(files);

    // Clean up old previews
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));

    // Create new previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!user) {
      setError("Login is required to leave a review.");
      return;
    }
    if (!orderId) {
      setError("Please select the order this review is for.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const formData = new FormData();
      formData.append("rating", rating);
      formData.append("title", title);
      formData.append("comment", comment);
      formData.append("orderId", orderId);
      photos.forEach((photo) => formData.append("photos", photo));
      const response = await apiClient.post(
        `/reviews/products/${productId}/reviews`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      onCreated?.(response.data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit review");
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
        <h2 className="text-xl font-bold mb-4">Leave a Product Review</h2>
        {!user && (
          <p className="mb-3 p-2 rounded bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm">
            Please log in to submit a review.
          </p>
        )}
        {error && (
          <p className="mb-3 p-2 rounded bg-red-50 border border-red-300 text-red-700 text-sm">
            {error}
          </p>
        )}

        {/* Product Info header */}
        {(productName || productImage) && (
          <div className="flex items-center gap-3 p-3 mb-4 bg-gray-50 rounded-lg border border-gray-200">
            {productImage ? (
              <img
                src={resolveImageUrl(productImage) || "https://placehold.co/48x48?text=No+Image"}
                alt={productName || "Product"}
                className="w-12 h-12 object-cover rounded border border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">No image</div>
            )}
            <div>
              <div className="text-xs text-gray-500">Reviewing item</div>
              <div className="font-semibold text-gray-900 truncate max-w-[280px]">{productName || "Product"}</div>
            </div>
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Your rating</label>
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setRating(value)}
              className={
                value <= rating
                  ? "text-yellow-400 text-2xl"
                  : "text-gray-300 text-2xl"
              }
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
            >
              ★
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium mb-1">Order</label>
        {loadingOrders ? (
          <p className="text-sm text-gray-500 mb-4">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">
            You have no delivered orders for this product.
          </p>
        ) : (
          <select
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            className="w-full border rounded px-3 py-2 mb-4"
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
        )}

        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          value={title}
          onChange={(event) =>
            setTitle(event.target.value.slice(0, MAX_TITLE_LENGTH))
          }
          maxLength={MAX_TITLE_LENGTH}
          placeholder="Review title"
          className="w-full border rounded px-3 py-2 mb-4"
        />

        <label className="block text-sm font-medium mb-1">Comment</label>
        <textarea
          required
          value={comment}
          onChange={(event) =>
            setComment(event.target.value.slice(0, MAX_COMMENT_LENGTH))
          }
          maxLength={MAX_COMMENT_LENGTH}
          rows={5}
          placeholder="Share your experience"
          className="w-full border rounded px-3 py-2 mb-4"
        />
        <div className="text-xs text-gray-500 mb-4">
          {comment.length} / {MAX_COMMENT_LENGTH} characters
        </div>

        <label className="block text-sm font-medium mb-1">
          Photos (optional, max {MAX_PHOTOS})
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotosChange}
          className="w-full border rounded px-3 py-2 mb-2"
        />
        {photoPreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {photoPreviews.map((preview, index) => (
              <img
                key={index}
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-16 h-16 object-cover rounded border border-gray-200"
              />
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
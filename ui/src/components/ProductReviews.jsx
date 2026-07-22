import React, { useEffect, useState } from "react";
import apiClient from "../services/apiClient";

const renderStars = (rating) => (
  <span>
    {Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={index < rating ? "text-yellow-400" : "text-gray-300"}
      >
        ★
      </span>
    ))}
  </span>
);

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const buyerLabel = (reviewer) => {
  if (!reviewer) return "Anonymous";
  if (reviewer.firstName || reviewer.lastName) {
    return `${reviewer.firstName || ""} ${reviewer.lastName || ""}`.trim();
  }
  return reviewer.username || "Anonymous";
};

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [productSummary, setProductSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const reviewsResponse = await apiClient.get(
          `/reviews/products/${productId}/reviews`,
          { params: ratingFilter ? { rating: ratingFilter } : {} },
        );
        if (cancelled) return;
        setReviews(reviewsResponse.data?.reviews || []);
        setProductSummary(reviewsResponse.data?.summary || null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load reviews",
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
  }, [productId, ratingFilter]);

  const averageRating = productSummary?.averageRating
    ? Number(productSummary.averageRating).toFixed(1)
    : "0.0";
  const totalReviews = productSummary?.totalReviews ?? reviews.length;

  if (loading && reviews.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-bold mb-4">Product Reviews</h2>
        <div className="text-gray-500">Loading reviews...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-bold mb-4">Product Reviews</h2>
        <div className="p-3 rounded bg-red-50 border border-red-300 text-red-700">
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4">Product Reviews</h2>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="text-2xl font-semibold">
          {averageRating} ★
        </div>
        <div className="text-gray-600 text-sm">
          Based on {totalReviews} review{totalReviews === 1 ? "" : "s"}
        </div>
        <label className="ml-auto text-sm">
          <span className="mr-2">Filter by rating:</span>
          <select
            value={ratingFilter}
            onChange={(event) => setRatingFilter(event.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">All</option>
            <option value="5">5 ★</option>
            <option value="4">4 ★</option>
            <option value="3">3 ★</option>
            <option value="2">2 ★</option>
            <option value="1">1 ★</option>
          </select>
        </label>
      </div>

      {reviews.length === 0 ? (
        <p className="text-gray-500">
          No reviews yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review._id}
              className="border rounded p-4 bg-white"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="flex items-center gap-1">
                  {renderStars(review.rating)}
                </div>
                <span className="font-semibold">
                  {buyerLabel(review.reviewerId)}
                </span>
                <span className="text-gray-500 text-sm">
                  {formatDate(review.reviewDate)}
                </span>
                {review.verifiedPurchase && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Verified Purchase
                  </span>
                )}
              </div>
              {review.title && (
                <p className="font-semibold mb-1">{review.title}</p>
              )}
              {review.comment && (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {review.comment}
                </p>
              )}
              {review.sellerResponse?.message && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mt-3">
                  <div className="font-semibold text-blue-900 mb-1">
                    Seller Response
                  </div>
                  <p className="text-blue-800 whitespace-pre-wrap">
                    {review.sellerResponse.message}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
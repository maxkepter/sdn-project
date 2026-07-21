import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

const MAX_RESPONSE_LENGTH = 5000;

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

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const buyerName = (review) => {
  const reviewer = review.reviewerId || {};
  if (reviewer.firstName || reviewer.lastName) {
    return `${reviewer.firstName || ""} ${reviewer.lastName || ""}`.trim();
  }
  return reviewer.username || "Anonymous";
};

const buyerUsername = (review) =>
  review.reviewerId?.username || "anonymous";

export default function SellerReviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    status: "published",
    rating: "",
    hasResponse: "",
    sort: "newest",
    search: "",
  });
  const [responseModal, setResponseModal] = useState(null);
  const [reportModal, setReportModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get("/reviews/seller", {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          ...filters,
        },
      });
      setReviews(response.data.reviews || []);
      setPagination((prev) => ({
        ...prev,
        ...(response.data.pagination || {}),
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiClient.get("/reviews/seller/statistics");
      setStats(response.data);
    } catch (err) {
      // surface statistics error as warning only; reviews list is the primary content
      console.error("Statistics load error:", err);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [pagination.page, filters]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRespond = (review) => {
    setResponseModal({
      review,
      message: review.sellerResponse?.message || "",
    });
  };

  const handleSubmitResponse = async () => {
    if (!responseModal?.message.trim()) {
      return;
    }
    const { review, message } = responseModal;
    const hasExistingResponse =
      Boolean(review.sellerResponse?.message) &&
      review.sellerResponse.message.trim() !== "";
    try {
      if (hasExistingResponse) {
        await apiClient.put(
          `/reviews/seller/${review._id}/response`,
          { message },
        );
      } else {
        await apiClient.post(`/reviews/seller/${review._id}/respond`, {
          message,
        });
      }
      setResponseModal(null);
      await Promise.all([loadReviews(), loadStatistics()]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit response");
    }
  };

  const handleToggleVisibility = async (review) => {
    const next = review.status === "hidden" ? "unhide" : "hide";
    try {
      await apiClient.post(`/reviews/seller/${review._id}/${next}`);
      await Promise.all([loadReviews(), loadStatistics()]);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${next} review`);
    }
  };

  const handleOpenReport = (review) => {
    setReportModal({ review, reason: "" });
  };

  const handleSubmitReport = async () => {
    if (!reportModal?.reason.trim()) return;
    try {
      await apiClient.post(
        `/reviews/seller/${reportModal.review._id}/report`,
        { reason: reportModal.reason.trim() },
      );
      setReportModal(null);
      await loadReviews();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to report review");
    }
  };

  const goToPage = (next) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(prev.totalPages || 1, next)),
    }));
  };

  const statCards = [
    { label: "Total Reviews", value: stats?.totalReviews ?? 0 },
    {
      label: "Average Rating",
      value: stats?.averageRating
        ? `${Number(stats.averageRating).toFixed(1)} ★`
        : "0.0 ★",
    },
    { label: "Responded Count", value: stats?.respondedCount ?? 0 },
    {
      label: "Response Rate",
      value: stats?.responseRate != null ? `${stats.responseRate}%` : "0%",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Customer Reviews</h1>
        <p className="text-gray-600">
          Manage and respond to customer reviews for your listings.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-300 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-gray-600 text-sm">{card.label}</div>
          </div>
        ))}
      </div>

      {stats?.ratingDistribution && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Rating Distribution</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution[rating] || 0;
              const pct = stats.totalReviews
                ? (count / stats.totalReviews) * 100
                : 0;
              return (
                <div key={rating} className="flex items-center">
                  <div className="w-12 text-sm">{rating} ★</div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-sm text-gray-600 text-right">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="reported">Reported</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Rating</label>
            <select
              value={filters.rating}
              onChange={(e) => handleFilterChange("rating", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Response</label>
            <select
              value={filters.hasResponse}
              onChange={(e) =>
                handleFilterChange("hasResponse", e.target.value)
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All</option>
              <option value="true">Replied</option>
              <option value="false">Not replied</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Sort By</label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange("sort", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_rating">Highest Rating</option>
              <option value="lowest_rating">Lowest Rating</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              placeholder="Search comments or titles..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {loading && reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No reviews found matching your filters.
          </div>
        ) : (
          <div className="divide-y">
            {reviews.map((review) => {
              const hasResponse = Boolean(
                review.sellerResponse?.message &&
                  review.sellerResponse.message.trim() !== "",
              );
              return (
                <div key={review._id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                        <span className="font-semibold">
                          {buyerName(review)}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {formatDate(review.reviewDate)}
                        </span>
                        {review.verifiedPurchase && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Verified Purchase
                          </span>
                        )}
                        {review.status === "hidden" && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            Hidden
                          </span>
                        )}
                        {review.status === "pending_moderation" && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            Reported
                          </span>
                        )}
                      </div>

                      {review.title && (
                        <h3 className="font-semibold text-lg mb-2">
                          {review.title}
                        </h3>
                      )}

                      {review.comment && (
                        <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                          {review.comment}
                        </p>
                      )}

                      {review.productId?.title && (
                        <div className="text-sm text-gray-600 mb-4">
                          <Link
                            to={`/product/${review.productId._id || review.productId}`}
                            className="text-blue-600 hover:underline"
                          >
                            {review.productId.title}
                          </Link>
                        </div>
                      )}

                      {hasResponse && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                          <div className="font-semibold text-blue-900 mb-1">
                            Your Response
                          </div>
                          <p className="text-blue-800 whitespace-pre-wrap">
                            {review.sellerResponse.message}
                          </p>
                          <div className="text-xs text-blue-600 mt-2">
                            {formatDate(
                              review.sellerResponse.updatedAt ||
                                review.sellerResponse.respondedAt,
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => handleRespond(review)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {hasResponse ? "Edit Response" : "Respond"}
                    </button>
                    {review.status === "published" && (
                      <button
                        onClick={() => handleToggleVisibility(review)}
                        className="px-4 py-2 border rounded hover:bg-gray-50"
                      >
                        Hide
                      </button>
                    )}
                    {review.status === "hidden" && (
                      <button
                        onClick={() => handleToggleVisibility(review)}
                        className="px-4 py-2 border rounded hover:bg-gray-50"
                      >
                        Unhide
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenReport(review)}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                    >
                      Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-6 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing{" "}
              {Math.min(
                (pagination.page - 1) * pagination.limit + 1,
                pagination.total,
              )}{" "}
              to {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} reviews
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {responseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {responseModal.review?.sellerResponse?.message
                ? "Edit Response"
                : "Respond to Review"}
            </h2>
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Review:</div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(responseModal.review?.rating || 0)}
                  <span className="text-sm text-gray-500 ml-2">
                    by {buyerUsername(responseModal.review || {})}
                  </span>
                </div>
                {responseModal.review?.title && (
                  <div className="font-semibold">
                    {responseModal.review.title}
                  </div>
                )}
                {responseModal.review?.comment && (
                  <div className="text-gray-700 mt-2 whitespace-pre-wrap">
                    {responseModal.review.comment}
                  </div>
                )}
              </div>
            </div>
            <textarea
              value={responseModal.message}
              onChange={(e) =>
                setResponseModal((prev) => ({
                  ...prev,
                  message: e.target.value,
                }))
              }
              placeholder="Enter your response..."
              rows={6}
              maxLength={MAX_RESPONSE_LENGTH}
              className="w-full border rounded p-3 mb-2"
            />
            <div className="text-sm text-gray-500 mb-4">
              {responseModal.message.length} / {MAX_RESPONSE_LENGTH} characters
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResponseModal(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={!responseModal.message.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Report Review</h2>
            <p className="text-sm text-gray-600 mb-3">
              Provide a reason for reporting this review.
            </p>
            <textarea
              value={reportModal.reason}
              onChange={(e) =>
                setReportModal((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              rows={4}
              placeholder="Reason..."
              className="w-full border rounded p-3 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReportModal(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportModal.reason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
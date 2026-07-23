import React, { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

const MAX_RESPONSE_LENGTH = 5000;

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const buyerName = (feedback) => {
  const buyer = feedback.buyerId || {};
  if (buyer.firstName || buyer.lastName) {
    return `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim();
  }
  return buyer.username || "Anonymous";
};

const buyerUsername = (feedback) =>
  feedback.buyerId?.username || "anonymous";

export default function SellerFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
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
    search: "",
    period: "all",
  });
  const [responseModal, setResponseModal] = useState(null);
  const [reportModal, setReportModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get("/reviews/seller/feedback", {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          ...filters,
        },
      });
      setFeedbacks(response.data.feedbacks || []);
      setPagination((prev) => ({
        ...prev,
        ...(response.data.pagination || {}),
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load feedbacks");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiClient.get("/reviews/seller/feedback/statistics");
      setStats(response.data);
    } catch (err) {
      console.error("Statistics load error:", err);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [pagination.page, filters]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRespond = (feedback) => {
    setResponseModal({
      feedback,
      message: feedback.sellerResponse?.message || "",
    });
  };

  const handleSubmitResponse = async () => {
    if (!responseModal?.message.trim()) {
      return;
    }
    const { feedback, message } = responseModal;
    try {
      await apiClient.post(`/reviews/seller/feedback/${feedback._id}/respond`, {
        message,
      });
      setResponseModal(null);
      await Promise.all([loadFeedbacks(), loadStatistics()]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit response");
    }
  };

  const handleToggleVisibility = async (feedback) => {
    const next = feedback.status === "hidden" ? "unhide" : "hide";
    try {
      await apiClient.post(`/reviews/seller/feedback/${feedback._id}/${next}`);
      await Promise.all([loadFeedbacks(), loadStatistics()]);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${next} feedback`);
    }
  };

  const handleOpenReport = (feedback) => {
    setReportModal({ feedback, reason: "" });
  };

  const handleSubmitReport = async () => {
    if (!reportModal?.reason.trim()) return;
    try {
      await apiClient.post(
        `/reviews/seller/feedback/${reportModal.feedback._id}/report`,
        { reason: reportModal.reason.trim() },
      );
      setReportModal(null);
      await loadFeedbacks();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to report feedback");
    }
  };

  const goToPage = (next) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(prev.totalPages || 1, next)),
    }));
  };

  const statCards = [
    { label: "Positive Feedback Rate", value: stats?.positiveRate != null ? `${stats.positiveRate}%` : "0%" },
    { label: "Positive Count", value: stats?.positiveCount ?? 0 },
    { label: "Neutral Count", value: stats?.neutralCount ?? 0 },
    { label: "Negative Count", value: stats?.negativeCount ?? 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Seller Feedback</h1>
        <p className="text-gray-600">
          Manage and respond to feedback left by buyers for your transactions.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-300 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-lg shadow p-6 border border-gray-100"
          >
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-gray-600 text-sm mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white"
            >
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="reported">Reported</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Rating</label>
            <select
              value={filters.rating}
              onChange={(e) => handleFilterChange("rating", e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white"
            >
              <option value="">All Ratings</option>
              <option value="positive">🟢 Positive</option>
              <option value="neutral">🟡 Neutral</option>
              <option value="negative">🔴 Negative</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Response</label>
            <select
              value={filters.hasResponse}
              onChange={(e) =>
                handleFilterChange("hasResponse", e.target.value)
              }
              className="w-full border rounded px-3 py-2 bg-white"
            >
              <option value="">All</option>
              <option value="true">Replied</option>
              <option value="false">Not replied</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Time Period</label>
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange("period", e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white"
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="6m">Last 6 Months</option>
              <option value="12m">Last 12 Months</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Search Comments</label>
            <input
              type="text"
              placeholder="Search feedback..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100">
        {loading && feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-semibold">Loading feedback...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-semibold">
            No feedback found matching your filters.
          </div>
        ) : (
          <div className="divide-y">
            {feedbacks.map((fb) => {
              const hasResponse = Boolean(
                fb.sellerResponse?.message &&
                  fb.sellerResponse.message.trim() !== "",
              );
              return (
                <div key={fb._id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-lg">
                          {fb.rating === "positive" ? "🟢" : fb.rating === "neutral" ? "🟡" : "🔴"}
                        </span>
                        <span className="font-semibold capitalize text-sm">
                          {fb.rating}
                        </span>
                        <span className="text-gray-400 text-xs">|</span>
                        <span className="font-semibold text-sm">
                          {buyerName(fb)}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {formatDate(fb.createdAt)}
                        </span>
                        {fb.status === "hidden" && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            Hidden
                          </span>
                        )}
                        {fb.isReported && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            Reported
                          </span>
                        )}
                      </div>

                      {fb.comment && (
                        <p className="text-gray-700 text-sm mb-4 whitespace-pre-wrap">
                          {fb.comment}
                        </p>
                      )}

                      {hasResponse && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-2 rounded-r">
                          <div className="font-semibold text-blue-900 text-xs mb-1">
                            Your Response
                          </div>
                          <p className="text-blue-800 text-sm whitespace-pre-wrap">
                            {fb.sellerResponse.message}
                          </p>
                          <div className="text-xs text-blue-600 mt-2">
                            {formatDate(
                              fb.sellerResponse.updatedAt ||
                                fb.sellerResponse.respondedAt,
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={() => handleRespond(fb)}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-semibold"
                    >
                      {hasResponse ? "Edit Reply" : "Reply"}
                    </button>
                    {fb.status === "published" && (
                      <button
                        onClick={() => handleToggleVisibility(fb)}
                        className="px-4 py-2 border rounded text-sm hover:bg-gray-50 font-semibold"
                      >
                        Hide
                      </button>
                    )}
                    {fb.status === "hidden" && (
                      <button
                        onClick={() => handleToggleVisibility(fb)}
                        className="px-4 py-2 border rounded text-sm hover:bg-gray-50 font-semibold"
                      >
                        Unhide
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenReport(fb)}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50 font-semibold"
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
              of {pagination.total} feedbacks
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50 text-sm hover:bg-gray-50 font-semibold"
              >
                Previous
              </button>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border rounded disabled:opacity-50 text-sm hover:bg-gray-50 font-semibold"
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
              {responseModal.feedback?.sellerResponse?.message
                ? "Edit Reply"
                : "Reply to Feedback"}
            </h2>
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Feedback comment:</div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <span>
                    {responseModal.feedback?.rating === "positive" ? "🟢" : responseModal.feedback?.rating === "neutral" ? "🟡" : "🔴"}
                  </span>
                  <span className="text-sm font-semibold capitalize">
                    {responseModal.feedback?.rating}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    by {buyerUsername(responseModal.feedback || {})}
                  </span>
                </div>
                {responseModal.feedback?.comment && (
                  <div className="text-gray-700 mt-2 whitespace-pre-wrap text-sm">
                    {responseModal.feedback.comment}
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
              className="w-full border rounded p-3 mb-2 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <div className="text-sm text-gray-500 mb-4">
              {responseModal.message.length} / {MAX_RESPONSE_LENGTH} characters
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResponseModal(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={!responseModal.message.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
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
            <h2 className="text-xl font-bold mb-4">Report Feedback</h2>
            <p className="text-sm text-gray-600 mb-3 font-semibold">
              Provide a reason for reporting this feedback.
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
              placeholder="Reason for report..."
              className="w-full border rounded p-3 mb-4 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReportModal(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportModal.reason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-semibold"
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

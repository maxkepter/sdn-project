import React, { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

// UI surface uses "Complaints" while the backend uses "/api/v1/disputes".
// Backend keeps the disputes path for compatibility with existing integrations.

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under Review" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_BADGE = {
  open: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const formatStatus = (status) =>
  (status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "-";
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const MAX_RESOLUTION = 2000;

export default function SellerComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("open");
  const [updateResolution, setUpdateResolution] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status,
      };
      if (filters.search.trim()) params.search = filters.search.trim();

      const response = await apiClient.get("/disputes", { params });
      setComplaints(response.data.disputes || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total ?? 0,
        totalPages: response.data.pagination?.totalPages ?? 0,
      }));
    } catch (err) {
      console.error("Error loading complaints:", err);
      setError(
        err.response?.data?.message || "Unable to load complaints. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters.status]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchComplaints();
    }
  };

  const handleClearSearch = () => {
    setFilters((prev) => ({ ...prev, search: "" }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (next) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(prev.totalPages || 1, next)),
    }));
  };

  const openComplaint = async (complaint) => {
    try {
      setDetailLoading(true);
      const res = await apiClient.get(`/disputes/${complaint._id}`);
      setSelectedComplaint(res.data);
      setUpdateStatus(res.data.status || "open");
      setUpdateResolution(res.data.resolution || "");
    } catch (err) {
      console.error("Failed to load complaint detail:", err);
      setError(
        err.response?.data?.message || "Failed to load complaint detail."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeComplaint = () => {
    setSelectedComplaint(null);
    setUpdateStatus("open");
    setUpdateResolution("");
  };

  const handleStatusUpdate = async () => {
    if (!selectedComplaint) return;
    // Client-side validation per state machine
    if (["resolved", "rejected"].includes(updateStatus)) {
      if (!updateResolution.trim()) {
        alert("A resolution message is required to resolve or reject a complaint.");
        return;
      }
      if (updateResolution.length > MAX_RESOLUTION) {
        alert(`Resolution cannot exceed ${MAX_RESOLUTION} characters.`);
        return;
      }
    }

    try {
      setUpdateLoading(true);
      await apiClient.patch(`/disputes/${selectedComplaint._id}/resolve`, {
        status: updateStatus,
        resolution: updateResolution,
      });
      closeComplaint();
      await fetchComplaints();
    } catch (err) {
      console.error("Failed to update complaint:", err);
      alert(
        err.response?.data?.message ||
          "Unable to update complaint. Please try again."
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  // Stat cards computed from current result set
  const total = pagination.total;
  const counts = complaints.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    { open: 0, under_review: 0, resolved: 0, rejected: 0 }
  );

  const statCards = [
    { label: "Total Complaints", value: total, color: "text-gray-900" },
    { label: "Open", value: counts.open, color: "text-yellow-600" },
    {
      label: "Under Review",
      value: counts.under_review,
      color: "text-blue-600",
    },
    {
      label: "Resolved / Rejected",
      value: counts.resolved + counts.rejected,
      color: "text-green-600",
    },
  ];

  const isTerminal =
    selectedComplaint &&
    ["resolved", "rejected"].includes(selectedComplaint.status);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Complaints</h1>
        <p className="text-gray-600 mt-1">
          Manage disputes opened by buyers on orders of your listings. (Backend
          path: <code className="text-xs bg-gray-100 px-1 rounded">/api/v1/disputes</code>)
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
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-gray-500 text-sm mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search (order number or buyer name)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  handleFilterChange("search", e.target.value)
                }
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by order number or buyer name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {filters.search && (
                <button
                  onClick={handleClearSearch}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {loading ? "Loading..." : `${total} complaint${total === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading && complaints.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Loading complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No complaints found for the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Complaint #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raised
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {complaints.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">
                      {c._id ? c._id.slice(-6).toUpperCase() : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {c.orderId?.orderNumber || c.orderId?._id?.toString() || c.orderId?.toString() || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {c.raisedBy?.username || "Anonymous"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                      {c.description
                        ? `${c.description.substring(0, 50)}${c.description.length > 50 ? "..." : ""}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-medium rounded ${STATUS_BADGE[c.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {formatStatus(c.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(c.updatedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openComplaint(c)}
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages} ({total} total)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail / Resolution Modal */}
      {(selectedComplaint || detailLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Complaint Detail</h2>
              <button
                onClick={closeComplaint}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              selectedComplaint && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Order Number</div>
                      <div className="font-mono font-semibold mt-1">
                        {selectedComplaint.orderId?.orderNumber ||
                          selectedComplaint.orderId?._id}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Order Status</div>
                      <div className="font-semibold mt-1 capitalize">
                        {formatStatus(selectedComplaint.orderId?.status)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Buyer</div>
                      <div className="font-medium mt-1">
                        {selectedComplaint.raisedBy?.username || "Anonymous"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {selectedComplaint.raisedBy?.email}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Order Total</div>
                      <div className="font-semibold mt-1">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency:
                            selectedComplaint.orderId?.pricing?.currency || "USD",
                        }).format(
                          selectedComplaint.orderId?.pricing?.total ||
                            selectedComplaint.orderId?.totalPrice ||
                            0
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Order Date</div>
                      <div className="font-medium mt-1">
                        {formatDateTime(selectedComplaint.orderId?.orderDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Current Status</div>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded mt-1 ${
                          STATUS_BADGE[selectedComplaint.status] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formatStatus(selectedComplaint.status)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Issue description
                    </div>
                    <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </div>
                  </div>

                  {selectedComplaint.resolution && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Previous resolution
                      </div>
                      <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-3 text-sm text-blue-900 whitespace-pre-wrap">
                        {selectedComplaint.resolution}
                      </div>
                    </div>
                  )}

                  {isTerminal ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-600">
                      This complaint is closed and cannot be updated further.
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Update Status
                      </label>
                      <select
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="open">Open</option>
                        <option value="under_review">Under Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  )}

                  {!isTerminal && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution / Reply Message
                      </label>
                      <textarea
                        value={updateResolution}
                        onChange={(e) =>
                          setUpdateResolution(e.target.value)
                        }
                        rows={4}
                        maxLength={MAX_RESOLUTION}
                        placeholder="Required when status is 'resolved' or 'rejected'."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {updateResolution.length} / {MAX_RESOLUTION} characters
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={closeComplaint}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    {!isTerminal && (
                      <button
                        onClick={handleStatusUpdate}
                        disabled={updateLoading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold"
                      >
                        {updateLoading ? "Updating..." : "Save Changes"}
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

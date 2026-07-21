import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function SellerFeedback() {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await apiClient.get("/reviews/seller/statistics");
        if (!cancelled) setFeedback(response.data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Unable to load feedback");
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

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-gray-600">Loading feedback...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Feedback</h1>
        <div className="p-4 rounded bg-red-50 border border-red-300 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Reviews", value: feedback?.totalReviews ?? 0 },
    {
      label: "Average Rating",
      value: `${Number(feedback?.averageRating || 0).toFixed(1)} ★`,
    },
    { label: "Positive Rate", value: `${feedback?.positiveRate ?? 0}%` },
    { label: "Recent (30 days)", value: feedback?.recentCount ?? 0 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Feedback</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-gray-600 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Rating Distribution</h2>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = feedback?.ratingDistribution?.[rating] || 0;
          const totalReviews = feedback?.totalReviews || 0;
          const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          return (
            <div className="flex items-center mb-2" key={rating}>
              <span className="w-12">{rating} ★</span>
              <div className="flex-1 bg-gray-200 h-2 rounded mx-4">
                <div
                  className="bg-blue-600 h-2 rounded"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-gray-700">{count}</span>
            </div>
          );
        })}
      </div>
      <Link className="text-blue-600 hover:underline" to="/seller/reviews">
        Manage reviews
      </Link>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function SellerReviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("published");
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const [reviewResponse, statsResponse] = await Promise.all([
        apiClient.get("/reviews/seller", { params: { page, status } }),
        apiClient.get("/reviews/seller/statistics"),
      ]);
      setReviews(reviewResponse.data.reviews || []);
      setStats(statsResponse.data);
    } catch (err) { setError(err.response?.data?.message || "Unable to load reviews"); }
  };
  useEffect(() => { load(); }, [page, status]);
  const submit = async () => {
    if (!message.trim()) return;
    try { await apiClient.post(`/reviews/seller/${modal._id}/respond`, { message }); setModal(null); setMessage(""); load(); } catch (err) { setError(err.response?.data?.message || "Unable to respond"); }
  };
  const action = async (id, name) => { try { await apiClient.post(`/reviews/seller/${id}/${name}`); load(); } catch (err) { setError(err.response?.data?.message || "Action failed"); } };
  const stars = (rating) => <span className="text-yellow-400">{"★".repeat(rating)}<span className="text-gray-300">{"★".repeat(5 - rating)}</span></span>;
  return <div className="max-w-7xl mx-auto px-4 py-8"><h1 className="text-3xl font-bold mb-2">Customer Reviews</h1><p className="text-gray-600 mb-8">Manage and respond to customer reviews.</p>{error && <p className="text-red-600 mb-4">{error}</p>}
    {stats && <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">{[[stats.totalReviews, "Total Reviews"], [Number(stats.averageRating || 0).toFixed(1), "Average Rating"], [stats.positiveRate + "%", "Positive Rate"], [stats.recentCount || 0, "Recent (30 days)"]].map(([value, label]) => <div className="bg-white rounded-lg shadow p-6" key={label}><div className="text-2xl font-bold">{value}</div><div className="text-gray-600 text-sm">{label}</div></div>)}</div>}
    {stats?.ratingDistribution && <div className="bg-white rounded-lg shadow p-6 mb-8"><h2 className="text-xl font-semibold mb-4">Rating Distribution</h2>{[5, 4, 3, 2, 1].map((rating) => { const count = stats.ratingDistribution[rating] || 0; const pct = stats.totalReviews ? count / stats.totalReviews * 100 : 0; return <div className="flex items-center mb-2" key={rating}><span className="w-12">{rating} ★</span><div className="flex-1 bg-gray-200 rounded-full h-2 mx-4"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }} /></div><span>{count}</span></div>; })}</div>}
    <div className="bg-white rounded-lg shadow p-4 mb-6"><label className="text-sm font-medium mr-3">Status</label><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="border rounded px-3 py-2"><option value="published">Published</option><option value="hidden">Hidden</option><option value="pending_moderation">Reported</option></select></div>
    <div className="bg-white rounded-lg shadow divide-y">{reviews.length === 0 ? <div className="p-8 text-center text-gray-500">No reviews found.</div> : reviews.map((review) => <div className="p-6" key={review._id}><div className="flex justify-between"><div>{stars(review.rating)} <span className="ml-3 font-semibold">{review.reviewerId?.username || "Anonymous"}</span><span className="text-gray-500 text-sm ml-3">{new Date(review.reviewDate).toLocaleDateString()}</span>{review.verifiedPurchase && <span className="ml-3 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Verified Purchase</span>}</div><span className="text-sm">{review.status}</span></div><h3 className="font-semibold text-lg mt-3">{review.title}</h3><p className="text-gray-700 mt-2">{review.comment}</p>{review.sellerResponse?.message && <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4"><b>Your Response</b><p>{review.sellerResponse.message}</p></div>}<div className="flex gap-2 mt-4"><button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => { setModal(review); setMessage(review.sellerResponse?.message || ""); }}>{review.sellerResponse?.message ? "Edit Response" : "Respond"}</button>{review.status === "published" ? <button className="px-3 py-2 border rounded" onClick={() => action(review._id, "hide")}>Hide</button> : <button className="px-3 py-2 border rounded" onClick={() => action(review._id, "unhide")}>Unhide</button>}<button className="px-3 py-2 border rounded" onClick={() => action(review._id, "report")}>Report</button></div></div>)}</div>
    {modal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-6 max-w-xl w-full"><h2 className="text-xl font-bold mb-4">Respond to Review</h2><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={6} className="w-full border rounded p-3" /><p className="text-sm text-gray-500 mb-4">{message.length} / 5000 characters</p><div className="flex justify-end gap-2"><button className="px-4 py-2 border rounded" onClick={() => setModal(null)}>Cancel</button><button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={submit}>Submit Response</button></div></div></div>}</div>;
}

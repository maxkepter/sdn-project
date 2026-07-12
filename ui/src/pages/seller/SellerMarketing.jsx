import { useState, useEffect, useCallback } from "react";
import apiClient from "../../services/apiClient";

export default function SellerMarketing() {
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await apiClient.get("/coupons");
      setCoupons(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await apiClient.get("/products?limit=100");
      setProducts(res.data.products);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, [fetchCoupons, fetchProducts]);

  const handleCreate = async (data) => {
    try {
      await apiClient.post("/coupons", data);
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating coupon");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await apiClient.delete(`/coupons/${id}`);
      fetchCoupons();
    } catch (err) {
      alert("Error deleting coupon");
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Marketing & Coupons</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
        >
          + New Coupon
        </button>
      </div>

      {showForm && (
        <CouponForm
          products={products}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {coupons.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No coupons yet</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Discount</th>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Valid</th>
                <th className="text-left p-3">Max Usage</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold">{c.code}</td>
                  <td className="p-3">{c.discountPercent}%</td>
                  <td className="p-3">{c.productId?.title ? c.productId.title.substring(0, 30) : "All products"}</td>
                  <td className="p-3 text-xs">
                    {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">{c.maxUsage}</td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(c._id)} className="text-red-600 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CouponForm({ products, onSave, onCancel }) {
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
  const [maxUsage, setMaxUsage] = useState(100);
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      code,
      discountPercent: Number(discountPercent),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      maxUsage: Number(maxUsage),
      productId: productId || undefined,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Create Coupon</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Code</label>
            <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="SUMMER20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Discount %</label>
            <input required type="number" min="1" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700">Start Date</label>
              <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700">End Date</label>
              <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Max Usage</label>
            <input required type="number" min="1" value={maxUsage} onChange={(e) => setMaxUsage(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Apply to Product (optional)</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50">{saving ? "Saving..." : "Create"}</button>
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

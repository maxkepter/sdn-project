import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import apiClient from "../../services/apiClient";

export default function SellerDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState("products");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold text-blue-600">
              SDN Market
            </Link>
            <span className="text-sm text-gray-500">| Seller Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.username || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6 border-b pb-2">
          {[
            { key: "products", label: "Products" },
            { key: "inventory", label: "Inventory" },
            { key: "coupons", label: "Coupons" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t ${
                tab === t.key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "products" && <ProductsTab />}
        {tab === "inventory" && <InventoryTab />}
        {tab === "coupons" && <CouponsTab />}
      </div>
    </div>
  );
}

function ProductsTab() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await apiClient.get("/products");
      setProducts(res.data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleToggle = async (id) => {
    try {
      await apiClient.patch(`/products/${id}/toggle-visibility`);
      fetchProducts();
    } catch (err) {
      alert("Error toggling visibility");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await apiClient.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert("Error deleting product");
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">My Products</h2>
        <Link
          to="/seller/product/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
        >
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-4">No products yet</p>
          <Link
            to="/seller/product/new"
            className="text-blue-600 hover:underline"
          >
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left p-3">Image</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Stock</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    {p.images?.[0] ? (
                      <img
                        src={`http://localhost:5000${p.images[0]}`}
                        alt=""
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                        No img
                      </div>
                    )}
                  </td>
                  <td className="p-3 max-w-[200px] truncate">{p.title}</td>
                  <td className="p-3">${p.price}</td>
                  <td className="p-3">{p.categoryId?.name || "-"}</td>
                  <td className="p-3">{p.inventory?.quantity ?? 0}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        p.isHidden
                          ? "bg-gray-200 text-gray-600"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {p.isHidden ? "Hidden" : "Active"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/seller/product/edit/${p._id}`)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(p._id)}
                        className="text-orange-600 hover:underline text-xs"
                      >
                        {p.isHidden ? "Show" : "Hide"}
                      </button>
                      <button
                        onClick={() => handleDelete(p._id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </div>
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

function InventoryTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await apiClient.get("/inventory");
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleUpdate = async (productId, quantity) => {
    try {
      await apiClient.put(`/inventory/${productId}`, { quantity: parseInt(quantity) });
      fetchInventory();
    } catch (err) {
      alert("Error updating inventory");
    }
  };

  const handleAdjust = async (productId, adjustment) => {
    try {
      await apiClient.patch(`/inventory/${productId}/adjust`, { adjustment: parseInt(adjustment) });
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || "Error adjusting stock");
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Inventory Management</h2>
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No inventory data</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">SKU</th>
                <th className="text-left p-3">Current Stock</th>
                <th className="text-left p-3">Set Quantity</th>
                <th className="text-left p-3">Quick Adjust</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {inv.productId?.images?.[0] && (
                        <img
                          src={`http://localhost:5000${inv.productId.images[0]}`}
                          alt=""
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <span className="truncate max-w-[180px]">
                        {inv.productId?.title || "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">{inv.productId?.sku || "-"}</td>
                  <td className="p-3 font-semibold">{inv.quantity}</td>
                  <td className="p-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const qty = e.target.elements.qty.value;
                        if (qty !== "") handleUpdate(inv.productId?._id, qty);
                      }}
                      className="flex gap-1"
                    >
                      <input
                        name="qty"
                        type="number"
                        min="0"
                        defaultValue={inv.quantity}
                        className="w-20 px-2 py-1 border rounded text-xs"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="p-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const adj = e.target.elements.adj.value;
                        if (adj !== "") handleAdjust(inv.productId?._id, adj);
                      }}
                      className="flex gap-1"
                    >
                      <input
                        name="adj"
                        type="number"
                        placeholder="+/-"
                        className="w-20 px-2 py-1 border rounded text-xs"
                      />
                      <button
                        type="submit"
                        className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700"
                      >
                        Go
                      </button>
                    </form>
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

function CouponsTab() {
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
        <h2 className="text-xl font-bold">Coupons & Vouchers</h2>
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
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
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
                  <td className="p-3">
                    {c.productId?.title
                      ? c.productId.title.substring(0, 30)
                      : "All products"}
                  </td>
                  <td className="p-3 text-xs">
                    {new Date(c.startDate).toLocaleDateString()} -{" "}
                    {new Date(c.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">{c.maxUsage}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Delete
                    </button>
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
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );
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
            <label className="block text-xs font-medium text-gray-700">
              Code
            </label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="SUMMER20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Discount %
            </label>
            <input
              required
              type="number"
              min="1"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700">
                Start Date
              </label>
              <input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700">
                End Date
              </label>
              <input
                required
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Max Usage
            </label>
            <input
              required
              type="number"
              min="1"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Apply to Product (optional)
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

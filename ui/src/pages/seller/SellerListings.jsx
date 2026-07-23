import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

const resolveImageUrl = (img) => {
  if (!img) return "";
  return img.startsWith("http") ? img : `http://localhost:5000${img}`;
};

export default function SellerListings() {
  const [tab, setTab] = useState("products");

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Listings</h2>

      <div className="flex gap-4 mb-6 border-b pb-2">
        {[
          { key: "products", label: "Products" },
          { key: "inventory", label: "Inventory" },
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
        <span className="text-sm text-gray-500">{products.length} products</span>
        <Link
          to="/seller/product/new"
          className="bg-[#0968F6] text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
        >
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-4">No products yet</p>
          <Link to="/seller/product/new" className="text-blue-600 hover:underline">
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
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
                        src={resolveImageUrl(p.images[0])}
                        alt={p.title}
                        className="w-12 h-12 object-cover rounded bg-gray-100"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "https://placehold.co/48x48?text=No+Image";
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">No img</div>
                    )}
                  </td>
                  <td className="p-3 max-w-[200px] truncate">{p.title}</td>
                  <td className="p-3">${p.price}</td>
                  <td className="p-3">{p.categoryId?.name || "-"}</td>
                  <td className="p-3">{p.inventory?.quantity ?? 0}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${p.isHidden ? "bg-gray-200 text-gray-600" : "bg-green-100 text-green-700"}`}>
                      {p.isHidden ? "Hidden" : "Active"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/seller/product/edit/${p._id}`)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => handleToggle(p._id)} className="text-orange-600 hover:underline text-xs">{p.isHidden ? "Show" : "Hide"}</button>
                      <button onClick={() => handleDelete(p._id)} className="text-red-600 hover:underline text-xs">Delete</button>
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
      <h3 className="text-lg font-bold mb-4">Inventory Management</h3>
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No inventory data</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
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
                          src={resolveImageUrl(inv.productId.images[0])}
                          alt={inv.productId?.title || ""}
                          className="w-8 h-8 object-cover rounded bg-gray-100"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://placehold.co/32x32?text=?";
                          }}
                        />
                      )}
                      <span className="truncate max-w-[180px]">{inv.productId?.title || "Unknown"}</span>
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
                      <input name="qty" type="number" min="0" defaultValue={inv.quantity} className="w-20 px-2 py-1 border rounded text-xs" />
                      <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Save</button>
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
                      <input name="adj" type="number" placeholder="+/-" className="w-20 px-2 py-1 border rounded text-xs" />
                      <button type="submit" className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700">Go</button>
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

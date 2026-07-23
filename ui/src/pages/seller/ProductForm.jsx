import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { resolveImageUrl } from "../../utils/image";

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [storeCategories, setStoreCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [storeCategoryId, setStoreCategoryId] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [catRes, storeCatRes] = await Promise.all([
          apiClient.get("/categories"),
          apiClient.get("/store/categories")
        ]);
        setCategories(catRes.data);
        if (storeCatRes.data && storeCatRes.data.success) {
          setStoreCategories(storeCatRes.data.categories);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const loadProduct = async () => {
      try {
        const res = await apiClient.get(`/products/${id}`);
        const p = res.data;
        setTitle(p.title);
        setDescription(p.description || "");
        setPrice(p.price);
        setCategoryId(p.categoryId?._id || "");
        setStoreCategoryId(p.storeCategoryId || "");
        setSku(p.sku || "");
        setQuantity(p.inventory?.quantity ?? 10);
        setExistingImages(p.images || []);
      } catch (err) {
        setError("Failed to load product");
      } finally {
        setFetching(false);
      }
    };
    loadProduct();
  }, [id, isEdit]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExisting = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("categoryId", categoryId);
      if (storeCategoryId) formData.append("storeCategoryId", storeCategoryId);
      formData.append("sku", sku);
      formData.append("quantity", quantity);
      formData.append("existingImages", JSON.stringify(existingImages));
      files.forEach((f) => formData.append("images", f));

      if (isEdit) {
        await apiClient.put(`/products/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await apiClient.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate("/seller");
    } catch (err) {
      setError(err.response?.data?.message || "Error saving product");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/seller" className="text-xl font-bold text-blue-600">
            &larr; Seller Hub
          </Link>
          <span className="text-sm text-gray-500">
            {isEdit ? "Edit Product" : "New Product"}
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">
            {isEdit ? "Edit Product" : "List a New Product"}
          </h1>

          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Apple iPhone 15 Pro Max"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Product description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($) *
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="99.99"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Category (Optional)
                </label>
                <select
                  value={storeCategoryId}
                  onChange={(e) => setStoreCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No store category</option>
                  {storeCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional SKU"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Quantity *
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Images
              </label>

              {existingImages.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {existingImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={resolveImageUrl(img) || "https://placehold.co/80x80?text=Image"}
                        alt=""
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeExisting(i)}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {previews.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {previews.map((pr, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={pr}
                        alt=""
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : isEdit
                    ? "Update Product"
                    : "Create Product"}
              </button>
              <Link
                to="/seller"
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import ProductReviews from "../components/ProductReviews";
import LeaveReviewModal from "../components/LeaveReviewModal";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`http://localhost:5000/api/v1/products/${id}`, { headers })
      .then(async (response) => {
        if (!response.ok) {
          setError("Product not found");
          return;
        }
        const data = await response.json();
        setProduct(data);
      })
      .catch(() => setError("Unable to load product"));
  }, [id]);

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && <p className="text-red-600 mb-4">{error}</p>}
        {product && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">{product.title || product.name}</h1>
            <p className="text-gray-700 mb-4">{product.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-blue-600">
                {product.price ? `$${product.price}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Leave a Review
              </button>
            </div>
          </div>
        )}

        <ProductReviews productId={id} />

        {modalOpen && (
          <LeaveReviewModal
            productId={id}
            onClose={() => setModalOpen(false)}
            onCreated={() => {
              setModalOpen(false);
              window.location.reload();
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}
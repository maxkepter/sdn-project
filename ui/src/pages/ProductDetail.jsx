import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import ProductReviews from "../components/ProductReviews";
import LeaveReviewModal from "../components/LeaveReviewModal";
import apiClient from "../services/apiClient";
import { useAuth } from "../hooks/useAuth";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await apiClient.get(`/public/products/${id}`);
        if (!cancelled) setProduct(response.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load product",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <p className="mb-4 p-3 rounded bg-red-50 border border-red-300 text-red-700">
            {error}
          </p>
        )}
        {loading && (
          <div className="p-6 text-center text-gray-500">
            Loading product...
          </div>
        )}
        {product && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">
              {product.title || product.name}
            </h1>
            <p className="text-gray-700 mb-4">{product.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-blue-600">
                {product.price ? `$${product.price}` : ""}
              </span>
              {user ? (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
                >
                  Write a Product Review
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Login required to write a product review"
                  className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
                >
                  Login to write a product review
                </button>
              )}
            </div>
          </div>
        )}

        <ProductReviews productId={id} />

        {modalOpen && user && (
          <LeaveReviewModal
            productId={id}
            productName={product.title || product.name}
            productImage={product.images?.[0] || product.image}
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
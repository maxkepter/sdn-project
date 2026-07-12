import { Link } from "react-router-dom";

export default function Product({ product }) {
  const imgSrc = product?.images?.[0]
    ? product.images[0].startsWith("http")
      ? product.images[0]
      : `http://localhost:5000${product.images[0]}`
    : "https://placehold.co/300x300?text=No+Image";

  return (
    <Link
      to={`/product/${product?._id}`}
      className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="aspect-square bg-gray-50 overflow-hidden">
        <img
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
          src={imgSrc}
          alt={product?.title || ""}
        />
      </div>

      <div className="p-3">
        <div className="text-xs text-gray-400 uppercase tracking-wide truncate">
          {product?.categoryId?.name || "General"}
        </div>
        <div className="mt-1 text-sm font-medium text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem]">
          {product?.title}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            ${product?.price?.toFixed(2)}
          </span>
          {product?.price && (
            <span className="text-xs text-gray-400 line-through">
              ${(product.price * 1.25).toFixed(2)}
            </span>
          )}
        </div>
        {product?.condition && (
          <div className="mt-1">
            <span className="text-[10px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              {product.condition}
            </span>
          </div>
        )}
        <div className="mt-1 text-[10px] text-gray-400">
          Free shipping
        </div>
      </div>
    </Link>
  );
}

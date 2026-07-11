import { useEffect, useState } from "react";
import CarouselComp from "../components/CarouselComp";
import Product from "../components/Product";
import MainLayout from "../layout/MainLayout";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const getProducts = async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/products");
      const prods = await response.json();

      setProducts(prods);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getProducts();
  }, []);

  return (
    <MainLayout>
      <CarouselComp />

      <div className="max-w-[1200px] mx-auto">
        <div className="text-2xl font-bold mt-4 mb-6 px-4">Products</div>

        {/* ✅ loading UI */}
        {isLoading ? (
          <div className="text-center py-10">Loading...</div>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {products.map((product) => (
              <Product key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

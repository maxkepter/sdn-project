import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import Product from "../components/Product";
import apiClient from "../services/apiClient";

const categories = [
  { name: "Electronics", img: "https://i.ebayimg.com/images/g/5V4AAOSw5cRkd~1C/s-l500.webp", color: "bg-blue-100" },
  { name: "Fashion", img: "https://i.ebayimg.com/images/g/LpMAAOSwLxdkd~1~/s-l500.webp", color: "bg-pink-100" },
  { name: "Home & Garden", img: "https://i.ebayimg.com/images/g/0U0AAOSwj5pkd~2B/s-l500.webp", color: "bg-green-100" },
  { name: "Motors", img: "https://i.ebayimg.com/images/g/QcgAAOSw7kFkd~2D/s-l500.webp", color: "bg-orange-100" },
  { name: "Collectibles", img: "https://i.ebayimg.com/images/g/4YkAAOSwBJZkd~2E/s-l500.webp", color: "bg-purple-100" },
  { name: "Sports", img: "https://i.ebayimg.com/images/g/HWcAAOSwY9xkd~2G/s-l500.webp", color: "bg-yellow-100" },
  { name: "Health & Beauty", img: "https://i.ebayimg.com/images/g/HiMAAOSw0kRkd~2I/s-l500.webp", color: "bg-red-100" },
  { name: "Industrial", img: "https://i.ebayimg.com/images/g/AHwAAOSw5Ntkd~2J/s-l500.webp", color: "bg-gray-100" },
];

const deals = [
  { title: "Up to 60% off", subtitle: "Electronics", img: "https://i.ebayimg.com/images/g/z44AAOSw0xRkd~2K/s-l500.webp", color: "from-blue-500 to-blue-700" },
  { title: "Up to 50% off", subtitle: "Fashion", img: "https://i.ebayimg.com/images/g/LpMAAOSwLxdkd~1~/s-l500.webp", color: "from-pink-500 to-pink-700" },
  { title: "Up to 40% off", subtitle: "Home & Garden", img: "https://i.ebayimg.com/images/g/0U0AAOSwj5pkd~2B/s-l500.webp", color: "from-green-500 to-green-700" },
  { title: "Up to 55% off", subtitle: "Collectibles", img: "https://i.ebayimg.com/images/g/sB8AAOSwUPdkd~2L/s-l500.webp", color: "from-purple-500 to-purple-700" },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Use the shared apiClient so the baseURL handling is identical to
    // the rest of the app (and so we never accidentally build a
    // file:///... URL when the bundle is opened outside a web server).
    apiClient
      .get("/categories/products")
      .then((res) => {
        setProducts(res.data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return (
    <MainLayout>
      <div className="max-w-[1200px] mx-auto">
        <div
          className="relative bg-cover bg-center h-[400px] mx-4 mt-4 rounded-2xl overflow-hidden"
          style={{ backgroundImage: "url('https://i.ebayimg.com/images/g/hiMAAOSwWXtlYHui/s-l1600.webp')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
          <div className="relative z-10 flex flex-col justify-center h-full px-10">
            <h1 className="text-4xl font-bold text-white">Discover great deals</h1>
            <p className="mt-2 text-lg text-white/80">Shop millions of items at unbeatable prices.</p>
            <Link
              to="/sell"
              className="mt-4 w-fit bg-[#0968F6] hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-full text-sm transition"
            >
              Start selling
            </Link>
          </div>
        </div>

        <div className="mt-8 mx-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Shop by category</h2>
          <div className="grid grid-cols-8 gap-3">
            {categories.map((cat, i) => (
              <Link
                key={i}
                to={`/?category=${cat.name}`}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 hover:shadow-md transition"
              >
                <div className={`w-16 h-16 ${cat.color} rounded-full flex items-center justify-center overflow-hidden`}>
                  <img src={cat.img} alt="" className="w-12 h-12 object-contain" />
                </div>
                <span className="text-xs text-gray-700 text-center font-medium">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Daily deals</h2>
            <Link to="/" className="text-sm text-[#0968F6] hover:underline">See all</Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {deals.map((deal, i) => (
              <Link
                key={i}
                to="/"
                className="group relative rounded-xl overflow-hidden bg-white border border-gray-200 hover:shadow-lg transition"
              >
                <div className={`bg-gradient-to-br ${deal.color} h-40 flex items-center justify-center p-4`}>
                  <img src={deal.img} alt="" className="h-full object-contain group-hover:scale-105 transition-transform" />
                </div>
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {deal.title}
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-gray-800">{deal.subtitle}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Shop now</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 mx-4 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Trending on eBay</h2>
            <Link to="/" className="text-sm text-[#0968F6] hover:underline">See all</Link>
          </div>
          {isLoading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-4">No products yet. Run the seed script first:</p>
              <code className="bg-gray-100 px-4 py-2 rounded text-sm">cd server && npm run seed</code>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {products.map((product) => (
                <Product key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

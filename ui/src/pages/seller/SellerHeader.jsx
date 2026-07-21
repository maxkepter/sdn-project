import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const tabs = [
  { label: "Overview", path: "/seller" },
  { label: "Orders", path: "/seller/orders" },
  { label: "Listings", path: "/seller/listings" },
  { label: "Marketing", path: "/seller/marketing" },
  { label: "Store", path: "/seller/store" },
  { label: "Performance", path: "/seller/performance" },
  { label: "Feedback", path: "/seller/feedback" },
  { label: "Reviews", path: "/seller/reviews" },
  { label: "Payments", path: "/seller/payments" },
  { label: "Research", path: "/seller/research" },
  { label: "Reports", path: "/seller/reports" },
];

export default function SellerHeader() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/seller") return location.pathname === "/seller";
    return location.pathname.startsWith(path);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Seller Hub</h1>
          <span className="text-sm text-gray-500">
            {user?.username || user?.email} ({user?.role})
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/seller/orders" className="text-blue-600 hover:underline">
            Messages (52)
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/help" className="text-blue-600 hover:underline">
            Seller Help
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-300 mt-3">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              to={tab.path}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                isActive(tab.path)
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        <span className="text-gray-300">|</span>
        <Link to="/seller" className="hover:text-gray-600">Comments</Link>
        <span className="text-gray-300">|</span>
        <Link to="/seller" className="hover:text-gray-600">Customize</Link>
        <span className="text-gray-300">|</span>
        <span>Listing site: United States</span>
      </div>
    </div>
  );
}

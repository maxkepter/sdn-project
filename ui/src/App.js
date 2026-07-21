import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BecomeSeller from "./pages/BecomeSeller";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/HomePage";
import SellerHub from "./pages/seller/SellerHub";
import SellerOverview from "./pages/seller/SellerOverview";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerListings from "./pages/seller/SellerListings";
import SellerMarketing from "./pages/seller/SellerMarketing";
import SellerStore from "./pages/seller/SellerStore";
import SellerPerformance from "./pages/seller/SellerPerformance";
import SellerPayments from "./pages/seller/SellerPayments";
import SellerResearch from "./pages/seller/SellerResearch";
import SellerReports from "./pages/seller/SellerReports";
import SellerReviews from "./pages/seller/SellerReviews";
import SellerFeedback from "./pages/seller/SellerFeedback";
import AutomateFeedback from "./pages/seller/AutomateFeedback";
import ShippedAwaitingFeedback from "./pages/seller/ShippedAwaitingFeedback";
import ProductForm from "./pages/seller/ProductForm";
import ListingPage from "./pages/ListingPage";
import SellPage from "./pages/SellPage";
import ProductDetail from "./pages/ProductDetail";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/become-seller" element={<BecomeSeller />} />
          <Route path="/listng" element={<ListingPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/seller"
            element={
              <PrivateRoute>
                <SellerHub />
              </PrivateRoute>
            }
          >
            <Route index element={<SellerOverview />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="listings" element={<SellerListings />} />
            <Route path="marketing" element={<SellerMarketing />} />
            <Route path="store" element={<SellerStore />} />
            <Route path="performance" element={<SellerPerformance />} />
            <Route path="feedback" element={<SellerFeedback />} />
            <Route path="reviews" element={<SellerReviews />} />
            <Route path="payments" element={<SellerPayments />} />
            <Route path="research" element={<SellerResearch />} />
            <Route path="reports" element={<SellerReports />} />
          </Route>
          <Route
            path="/seller/product/new"
            element={
              <PrivateRoute>
                <ProductForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/seller/product/edit/:id"
            element={
              <PrivateRoute>
                <ProductForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/automate-feedback"
            element={
              <PrivateRoute>
                <AutomateFeedback />
              </PrivateRoute>
            }
          />
          <Route
            path="/seller/orders/shipped-awaiting-feedback"
            element={
              <PrivateRoute>
                <ShippedAwaitingFeedback />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

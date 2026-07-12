import { Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import HeroBanner from "../components/home/HeroBanner";
import FeatureCards from "../components/home/FeatureCards";
import BusinessBanner from "../components/home/BusinessBanner";
import ListingTipsCarousel from "../components/home/ListingTipsCarousel";
import FaqSection from "../components/home/FaqSection";

export default function SellPage() {
  return (
    <MainLayout>
      <HeroBanner />
      <FeatureCards />
      <div className="flex justify-center py-8">
        <Link
          to="/listng"
          className="bg-[#0968F6] hover:bg-blue-700 text-white font-bold px-10 py-4 rounded-full text-lg transition shadow-lg"
        >
          Sell now
        </Link>
      </div>
      <BusinessBanner />
      <ListingTipsCarousel />
      <FaqSection />
    </MainLayout>
  );
}

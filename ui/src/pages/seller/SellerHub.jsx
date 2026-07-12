import { Outlet } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import SellerHeader from "./SellerHeader";

export default function SellerHub() {
  return (
    <MainLayout>
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <SellerHeader />
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </MainLayout>
  );
}

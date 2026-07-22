import { Link, useNavigate } from "react-router-dom";
import { BsChevronDown } from "react-icons/bs";
import { AiOutlineShoppingCart, AiOutlineBell, AiOutlineMail } from "react-icons/ai";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function TopMenu() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [isMenu, setIsMenu] = useState(false);

  const renderUserAuth = () => {
    if (user && user?.id) {
      return (
        <li className="relative group flex items-center h-full pr-4 z-50">
          <span className="flex items-center gap-1 hover:underline cursor-pointer">
            <div>Hi <b>{user.firstName || user.username}</b>!</div>
            <BsChevronDown size={10} />
          </span>

          <div className="absolute hidden group-hover:block bg-white w-[280px] text-[#333333] top-[100%] left-0 rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-4 cursor-default">
            <div className="flex items-start gap-4 mb-4">
              {/* Big Gray Avatar */}
              <div 
                onClick={() => navigate(`/usr/${user.username}`)}
                className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-90"
              >
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="font-bold text-[14px]">
                  {user.firstName} {user.lastName}
                </div>
                <div 
                  onClick={() => navigate(`/usr/${user.username}`)}
                  className="text-[13px] text-[#3665f3] hover:underline cursor-pointer"
                >
                  {user.username} (0)
                </div>
              </div>
            </div>

            <ul className="flex flex-col gap-4 text-[14px] text-gray-800 mt-2">
              <li className="hover:underline cursor-pointer" onClick={() => navigate('/settings')}>
                Account settings
              </li>
              <li 
                onClick={() => logout()}
                className="hover:underline cursor-pointer"
              >
                Sign out
              </li>
            </ul>
          </div>
        </li>
      );
    }

    return (
      <li className="relative pr-4">
        <Link
          to="/login"
          className="flex items-center gap-1 hover:underline cursor-pointer"
        >
          <div>Sign in</div>
          <span>or</span>
          <Link to="/register" className="text-blue-600 hover:underline">register</Link>
        </Link>
      </li>
    );
  };
  return (
    <div id="TopMenu" className="border-b bg-white">
      <div className="flex items-center justify-between w-full mx-auto max-w-[1200px]">
        <ul
          id="TopMenuLeft"
          className="flex items-center text-[12px] text-gray-700 h-8"
        >
          {renderUserAuth()}
          <li className="px-3 hover:underline cursor-pointer">Deals</li>
          <li className="px-3 hover:underline cursor-pointer">Brand Outlet</li>
          <li className="px-3 hover:underline cursor-pointer">Gift Cards</li>
          <li className="px-3 hover:underline cursor-pointer">Help & Contact</li>
        </ul>

        <ul
          id="TopMenuRight"
          className="flex items-center text-[12px] text-gray-700 h-8"
        >
          <li
            onClick={() => navigate("/address")}
            className="flex items-center gap-1.5 px-3 hover:underline cursor-pointer"
          >
            <img 
              width={18} 
              src="https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg" 
              alt="VN" 
              className="rounded-sm" 
            />
            Ship to
          </li>
          <li 
                  onClick={() => {
                    if (!user) navigate('/login');
                    else if (user.role === 'seller') navigate('/seller');
                    else navigate('/become-seller');
                  }}
            className="flex items-center gap-1 px-3 hover:underline cursor-pointer"
          >
            <span>Sell</span>
            <BsChevronDown size={10} />
          </li>
          <li className="flex items-center gap-1 px-3 hover:underline cursor-pointer">
            Watchlist
            <BsChevronDown size={10} />
          </li>
          <li className="relative group flex items-center gap-1 px-3 cursor-pointer pr-5 h-full">
            <span className="hover:underline flex items-center gap-1">
              My eBay
              <BsChevronDown size={10} />
            </span>
            <div className="absolute hidden group-hover:block bg-white w-[220px] text-[#333333] z-50 top-[90%] right-0 rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.2)] py-3">
              <ul className="flex flex-col text-[13px]">
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Summary</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Recently Viewed</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Bids/Offers</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Watchlist</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Purchase History</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Buy Again</li>
                <li 
                  onClick={() => {
                    if (!user) navigate('/login');
                    else if (user.role === 'seller') navigate('/seller');
                    else navigate('/become-seller');
                  }}
                  className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer"
                >
                  Selling
                </li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Saved Feed</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Saved Searches</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Saved Sellers</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Payments</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">My Garage</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Preferences</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">My Collection</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Messages</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">PSA Vault</li>
                <li className="px-5 py-[6px] hover:underline text-gray-800 cursor-pointer">Issue Resolution Center</li>
              </ul>
            </div>
          </li>
          <li className="px-2 hover:text-blue-600 cursor-pointer text-gray-800">
            <AiOutlineMail size={22} />
          </li>
          <li className="px-2 hover:text-blue-600 cursor-pointer text-gray-800">
            <AiOutlineBell size={22} />
          </li>
          <li className="pl-2 pr-1 hover:text-blue-600 cursor-pointer text-gray-800">
            <div onClick={() => navigate("/cart")} className="relative">
              <AiOutlineShoppingCart size={22} />
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

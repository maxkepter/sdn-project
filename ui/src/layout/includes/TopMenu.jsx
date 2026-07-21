import { Link, useNavigate } from "react-router-dom";
import { BsChevronDown } from "react-icons/bs";
import { AiOutlineShoppingCart, AiOutlineBell, AiOutlineMail } from "react-icons/ai";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function TopMenu() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [isMenu, setIsMenu] = useState(false);

  const isLoggedIn = () => {
    if (user && user?.id) {
      return (
        <button
          onClick={() => (!isMenu ? setIsMenu(true) : setIsMenu(false))}
          className="flex items-center gap-1 hover:underline cursor-pointer"
        >
          <div>Hi <b>{user.firstName || user.username}</b>!</div>
          <BsChevronDown size={10} />
        </button>
      );
    }

    return (
      <Link
        to="/login"
        className="flex items-center gap-1 hover:underline cursor-pointer"
      >
        <div>Sign in</div>
        <span>or</span>
        <Link to="/register" className="text-blue-600 hover:underline">register</Link>
      </Link>
    );
  };

  return (
    <div id="TopMenu" className="border-b bg-white">
      <div className="flex items-center justify-between w-full mx-auto max-w-[1200px]">
        <ul
          id="TopMenuLeft"
          className="flex items-center text-[12px] text-gray-700 h-8"
        >
          <li className="relative pr-4">
            {isLoggedIn()}

            <div
              id="AuthDropdown"
              className={`
                absolute bg-white w-[200px] text-[#333333] z-40 top-[24px] left-0 border shadow-lg rounded-sm
                ${isMenu ? "visible" : "hidden"}
              `}
            >
              {user && user?.id && (
                <div>
                  <div className="flex items-center justify-start gap-2 p-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600">
                      {(user?.firstName || user?.username)?.[0]?.toUpperCase()}
                    </div>
                    <div className="font-bold text-[13px]">{user?.firstName || user?.username}</div>
                  </div>

                  <div className="border-b" />

                  <ul className="bg-white">
                    <li className="text-[12px] py-2 px-4 w-full hover:underline hover:text-blue-600 cursor-pointer">
                      <Link to="/orders">My orders</Link>
                    </li>
                    <li
                      onClick={() => { logout(); setIsMenu(false); }}
                      className="text-[12px] py-2 px-4 w-full hover:underline hover:text-blue-600 cursor-pointer"
                    >
                      Sign out
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </li>
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

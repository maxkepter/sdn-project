import { Link } from "react-router-dom";
import { BsChevronDown } from "react-icons/bs";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function TopMenu() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [isMenu, setIsMenu] = useState(false);

  const isLoggedIn = () => {
    if (user && user?.id) {
      return (
        <button
          onClick={() => (!isMenu ? setIsMenu(true) : setIsMenu(false))}
          className="flex items-center gap-2 hover:underline cursor-pointer"
        >
          <div>Hi, {user.name || user.username}</div>
          <BsChevronDown />
        </button>
      );
    }

    return (
      <Link
        to="/auth"
        className="flex items-center gap-2 hover:underline cursor-pointer"
      >
        <div>Login</div>
        <BsChevronDown />
      </Link>
    );
  };

  return (
    <div id="TopMenu" className="border-b">
      <div className="flex items-center justify-between w-full mx-auto max-w-[1200px]">
        <ul
          id="TopMenuLeft"
          className="flex items-center text-[11px] text-[#333333] px-2 h-8"
        >
          <li className="relative px-3">
            {isLoggedIn()}

            <div
              id="AuthDropdown"
              className={`
                absolute bg-white w-[200px] text-[#333333] z-40 top-[20px] left-0 border shadow-lg
                ${isMenu ? "visible" : "hidden"}
              `}
            >
              {user && user?.id && (
                <div>
                  <div className="flex items-center justify-start gap-1 p-3">
                    {user?.picture && <img width={50} src={user.picture} alt="" />}
                    <div className="font-bold text-[13px]">{user?.name || user?.username}</div>
                  </div>

                  <div className="border-b" />

                  <ul className="bg-white">
                    <li className="text-[11px] py-2 px-4 w-full hover:underline text-blue-500 hover:text-blue-600 cursor-pointer">
                      <Link to="/orders">My orders</Link>
                    </li>
                    <li
                      onClick={() => { logout(); setIsMenu(false); }}
                      className="text-[11px] py-2 px-4 w-full hover:underline text-blue-500 hover:text-blue-600 cursor-pointer"
                    >
                      Sign out
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </li>
          <li className="px-3 hover:underline cursor-pointer">Daily Deals</li>
          <li className="px-3 hover:underline cursor-pointer">Help & Contact</li>
        </ul>

        <ul
          id="TopMenuRight"
          className="flex items-center text-[11px] text-[#333333] px-2 h-8"
        >
          <li className="px-3 hover:underline cursor-pointer">
            <Link to="/seller" className="text-blue-600 font-semibold">Sell</Link>
          </li>
          <li
            onClick={() => navigate("/address")}
            className="flex items-center gap-2 px-3 hover:underline cursor-pointer"
          >
            <img width={32} src="/images/uk.png" alt="" />
            Ship to
          </li>
          <li className="px-3 hover:underline cursor-pointer">
            <div onClick={() => navigate("/cart")} className="relative">
              <AiOutlineShoppingCart size={22} />
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

import debounce from "debounce";
import { Link } from "react-router-dom";
import { useState } from "react";
import { AiOutlineSearch, AiOutlineCamera } from "react-icons/ai";
import { BsChevronDown } from "react-icons/bs";
import { BiLoaderCircle } from "react-icons/bi";

export default function MainHeader() {
  const [items] = useState([]);
  const [isSearching] = useState(false);

  const handleSearchName = debounce(async (event) => {
    // ... search logic
  }, 500);

  return (
    <div id="MainHeader" className="border-b bg-white">
      <nav className="flex items-center justify-between w-full mx-auto max-w-[1200px]">
        <div className="flex items-center w-full bg-white">
            <div className="flex lg:justify-start items-center justify-between gap-4 lg:gap-8 max-w-[1200px] w-full px-4 py-4 mx-auto">
              
              <div className="flex items-center gap-4">
                <Link to="/">
                  <img width="120" src="/images/logo.svg" alt="eBay Logo" />
                </Link>
                
                <button className="hidden lg:flex items-center gap-1 text-sm text-gray-700 hover:text-blue-600">
                  Shop by <br/> category 
                  <BsChevronDown className="mt-2" size={12}/>
                </button>
              </div>

            <div className="w-full flex-1">
              <div className="relative">
                <div className="flex items-center w-full gap-2">
                  <div className="relative flex items-center border-2 border-gray-800 rounded-full flex-1 h-11 bg-white overflow-hidden">
                    <div className="pl-4 text-gray-500">
                      <AiOutlineSearch size={20} />
                    </div>

                    <input
                      className="w-full h-full placeholder-gray-500 text-base pl-3 focus:outline-none"
                      onChange={handleSearchName}
                      placeholder="Search for anything"
                      type="text"
                    />

                    {isSearching && (
                      <BiLoaderCircle className="mr-2 animate-spin text-gray-500" size={22} />
                    )}
                    
                    <button className="pr-4 text-gray-500 hover:text-gray-800">
                      <AiOutlineCamera size={20} />
                    </button>

                    <div className="hidden md:flex items-center border-l h-7 border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer h-full transition-colors">
                      All Categories <BsChevronDown className="ml-2" size={12}/>
                    </div>

                    {items.length > 0 && (
                      <div className="absolute bg-white max-w-[910px] h-auto w-full z-20 left-0 top-12 border rounded-b-md shadow-lg">
                        {items.map((item) => (
                          <div className="p-1" key={item.id}>
                            <Link
                              to={`/product/${item?.id}`}
                              className="flex items-center justify-between w-full cursor-pointer hover:bg-gray-100 p-2"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  className="rounded-md object-cover h-10 w-10"
                                  src={item?.url + "/40"}
                                  alt=""
                                />
                                <div className="truncate font-medium">
                                  {item?.title}
                                </div>
                              </div>
                              <div className="font-semibold text-gray-700">
                                £{(item?.price / 100).toFixed(2)}
                              </div>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="hidden sm:flex items-center bg-[#3665f3] hover:bg-blue-700 text-base font-semibold text-white px-10 h-11 rounded-full transition-colors whitespace-nowrap">
                    Search
                  </button>

                  <div className="hidden lg:block text-[13px] text-gray-600 hover:text-blue-600 hover:underline cursor-pointer whitespace-nowrap ml-2">
                    Advanced
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

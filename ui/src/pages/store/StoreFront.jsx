import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { BsSearch, BsHeart, BsHeartFill, BsShare, BsChevronDown } from "react-icons/bs";
import MainLayout from "../../layout/MainLayout";

export default function StoreFront() {
  const { slug } = useParams();
  const [storeData, setStoreData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPublicStore = async () => {
      try {
        const res = await apiClient.get(`/store/public/${slug}`);
        if (res.data.success) {
          setStoreData(res.data.store);
          setCategories(res.data.categories);
          setListings(res.data.listings);
          setFilteredListings(res.data.listings);
        }
      } catch (err) {
        setError("Store not found or not published.");
      } finally {
        setLoading(false);
      }
    };
    fetchPublicStore();
  }, [slug]);

  useEffect(() => {
    let filtered = listings;
    
    if (selectedCategory) {
      filtered = filtered.filter(item => item.storeCategoryId === selectedCategory);
    }
    
    if (searchTerm.trim() !== "") {
      const lowerQuery = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) || 
        (item.description && item.description.toLowerCase().includes(lowerQuery))
      );
    }
    setFilteredListings(filtered);
  }, [searchTerm, selectedCategory, listings]);

  if (loading) return <MainLayout><div className="text-center py-20">Loading store...</div></MainLayout>;
  if (error || !storeData) return <MainLayout><div className="text-center py-20 text-red-500">{error}</div></MainLayout>;

  return (
    <MainLayout>
      <div className="bg-white min-h-screen pb-20 font-sans text-[#191919]">
        {/* Banner Section */}
        <div className="w-full bg-gray-100 flex justify-center">
          <div className="w-full max-w-[1200px] h-[270px] bg-white overflow-hidden">
            {storeData.bannerImageURL ? (
              <img src={storeData.bannerImageURL} alt="Store Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">No Banner</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          {/* Profile Section */}
          <div className="flex flex-col md:flex-row gap-8 py-8 items-start border-b border-gray-200">
            {/* Logo */}
            <div className="w-[120px] h-[120px] bg-white border border-gray-200 flex-shrink-0">
              {storeData.logoUrl ? (
                <img src={storeData.logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Logo</div>
              )}
            </div>

            {/* Store Details */}
            <div className="flex-grow">
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-2xl font-bold">{storeData.storeName}</h1>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsFollowing(!isFollowing)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    {isFollowing ? <BsHeartFill className="text-red-500 text-sm" /> : <BsHeart className="text-gray-600 text-sm" />}
                  </button>
                  <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <BsShare className="text-gray-600 text-sm" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-1 text-[13px] text-gray-600">
                <div><span className="font-bold text-black">{storeData.followersCount || 0}</span> Followers</div>
                <div><span className="font-bold text-black">{storeData.positiveFeedbackPercent > 0 ? storeData.positiveFeedbackPercent + '%' : '0%'}</span> Positive feedback</div>
                <div><span className="font-bold text-black">{storeData.itemsSold > 0 ? (storeData.itemsSold >= 1000 ? (storeData.itemsSold/1000).toFixed(1) + 'K' : storeData.itemsSold) : '0'}</span> Items sold</div>
              </div>
            </div>

            {/* About Us (Moved to header area) */}
            <div className="md:w-[400px] text-[13px] text-gray-700">
              <h3 className="font-bold text-black mb-1">About us</h3>
              <p className="line-clamp-3 leading-relaxed">
                {storeData.description || "Welcome to our eBay Shop."}
              </p>
              {storeData.description && (
                <button className="text-blue-600 hover:underline mt-1">Learn more</button>
              )}
            </div>
          </div>

          {/* Navigation & Search Row */}
          <div className="flex flex-col md:flex-row items-center justify-between py-4 border-b border-gray-200">
            <div className="flex gap-6 text-[14px]">
              <span className="font-bold border-b-2 border-black pb-[18px] -mb-[19px] cursor-pointer">Shop</span>
              <span className="text-gray-600 hover:underline cursor-pointer">About</span>
              <span className="text-gray-600 hover:underline cursor-pointer">Feedback</span>
            </div>
            
            <div className="relative w-full md:w-[400px] mt-4 md:mt-0">
              <BsSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder={`Search all ${listings.length} items`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#f5f5f5] rounded-full pl-10 pr-4 py-2.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex justify-between items-center py-6">
            <div className="relative">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-[#f5f5f5] pl-4 pr-10 py-2 rounded-full text-[14px] hover:bg-gray-200 transition-colors cursor-pointer outline-none font-bold"
              >
                <option value="">Shop by category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              <BsChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none" />
            </div>
            <div className="text-[13px] text-gray-600 flex items-center gap-2 cursor-pointer hover:underline">
              Update your shipping location <BsChevronDown className="text-[10px]" />
            </div>
          </div>

          {/* Main Content Area (Full width now) */}
          <div className="w-full">
            
            {/* Featured Categories */}
            {storeData.featuredCategories && storeData.featuredCategories.length > 0 && (
              <div className="mb-14">
                <h2 className="text-[20px] font-bold mb-6">Featured categories</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {storeData.featuredCategories.map(cat => (
                    <div 
                      key={cat.categoryId} 
                      className="flex flex-col cursor-pointer group"
                      onClick={() => {
                        setSelectedCategory(cat.categoryId);
                        document.getElementById('all-listings-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <div className="w-full aspect-square bg-[#f5f5f5] rounded-xl overflow-hidden mb-3">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                        )}
                      </div>
                      <span className="text-[14px] text-gray-800 hover:underline line-clamp-2">
                        {cat.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Listings */}
            {storeData.featuredListingsType === "Auto" && listings.length > 0 && (
              <div className="mb-14">
                <h2 className="text-[20px] font-bold mb-6">{storeData.featuredListingsRow || "Featured items"}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {listings.slice(0, 4).map(item => (
                    <div key={item._id} className="group cursor-pointer flex flex-col">
                      <div className="w-full aspect-square bg-[#f5f5f5] rounded-xl flex items-center justify-center overflow-hidden mb-3">
                        {item.images && item.images.length > 0 ? (
                          <img src={`http://localhost:5000${item.images[0]}`} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="text-gray-400 text-sm">No image</span>
                        )}
                      </div>
                      <h3 className="text-[14px] text-gray-800 line-clamp-2 mb-1 group-hover:underline">{item.title}</h3>
                      <div className="text-[16px] font-bold mb-1">${item.price.toFixed(2)}</div>
                      <div className="text-[12px] text-gray-500">
                        {item.shippingCost === 0 ? "Free shipping" : (item.shippingCost ? `+$${item.shippingCost.toFixed(2)} shipping` : "Shipping calculated at checkout")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Listings */}
            <div className="mb-14" id="all-listings-section">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-[20px] font-bold">
                  {searchTerm && selectedCategory 
                    ? `Search results in category for "${searchTerm}"` 
                    : searchTerm 
                      ? `Search results for "${searchTerm}"`
                      : selectedCategory
                        ? `Items in category`
                        : `All items`}
                </h2>
                {(searchTerm || selectedCategory) && (
                  <button onClick={() => { setSearchTerm(""); setSelectedCategory(""); }} className="text-[13px] text-blue-600 hover:underline">
                    Clear filters
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {filteredListings.map(item => (
                  <div key={item._id} className="group cursor-pointer flex flex-col">
                    <div className="w-full aspect-square bg-[#f5f5f5] rounded-xl flex items-center justify-center overflow-hidden mb-3">
                      {item.images && item.images.length > 0 ? (
                        <img src={`http://localhost:5000${item.images[0]}`} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <span className="text-gray-400 text-sm">No image</span>
                      )}
                    </div>
                    <h3 className="text-[14px] text-gray-800 line-clamp-2 mb-1 group-hover:underline">{item.title}</h3>
                    <div className="text-[16px] font-bold mb-1">${item.price.toFixed(2)}</div>
                    <div className="text-[12px] text-gray-500">
                      {item.shippingCost === 0 ? "Free shipping" : (item.shippingCost ? `+$${item.shippingCost.toFixed(2)} shipping` : "Shipping calculated at checkout")}
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredListings.length === 0 && (
                <div className="py-20 text-center text-gray-500 border border-dashed border-gray-300 rounded-xl bg-gray-50 mt-4">
                  {searchTerm ? `No results found for "${searchTerm}".` : "This store has no active items."}
                </div>
              )}
            </div>

            {/* Store Story & Policies */}
            {(storeData.storyTitle || storeData.storyText || storeData.storyImageUrl || (storeData.policies && storeData.policies.length > 0)) && (
              <div className="mb-14 border-t border-gray-200 pt-10">
                {/* Story */}
                {(storeData.storyTitle || storeData.storyText || storeData.storyImageUrl) && (
                  <div className="mb-10 flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/2">
                      {storeData.storyTitle && <h3 className="text-[20px] font-bold mb-4">{storeData.storyTitle}</h3>}
                      {storeData.storyText && <p className="text-[14px] text-gray-700 whitespace-pre-line leading-relaxed">{storeData.storyText}</p>}
                    </div>
                    {storeData.storyImageUrl && (
                      <div className="md:w-1/2 rounded-xl overflow-hidden bg-gray-100">
                        <img src={storeData.storyImageUrl} alt="Store Story" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {/* Policies */}
                {(storeData.policies && storeData.policies.length > 0) && (
                  <div className="bg-[#f5f5f5] rounded-xl p-8">
                    <h2 className="text-[20px] font-bold mb-6">Store Policies</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                      {storeData.policies.map((policy, index) => (
                        <div key={index}>
                          <h4 className="font-bold mb-2 text-[14px]">{policy.name}</h4>
                          <p className="text-[13px] text-gray-700 whitespace-pre-line leading-relaxed">{policy.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

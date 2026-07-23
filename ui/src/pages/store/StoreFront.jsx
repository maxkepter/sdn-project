import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { BsSearch, BsHeart, BsHeartFill, BsShare, BsChevronDown } from "react-icons/bs";
import MainLayout from "../../layout/MainLayout";
import { useAuth } from "../../hooks/useAuth";
import LeaveSellerFeedbackModal from "../../components/LeaveSellerFeedbackModal";
import { resolveImageUrl } from "../../utils/image";

export default function StoreFront() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [storeData, setStoreData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("shop");
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

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

  useEffect(() => {
    if (activeTab !== "feedback" || !storeData?.sellerId) return;

    const fetchFeedbackData = async () => {
      setLoadingFeedback(true);
      try {
        const [statsRes, listRes] = await Promise.all([
          apiClient.get(`/reviews/sellers/${storeData.sellerId}/feedback`),
          apiClient.get(`/reviews/sellers/${storeData.sellerId}/feedback/list`, {
            params: { page: feedbackPage, limit: 10 }
          })
        ]);
        setFeedbackStats(statsRes.data);
        setFeedbackList(listRes.data.feedbacks || []);
        setFeedbackTotalPages(listRes.data.pagination?.totalPages || 1);
        setFeedbackTotal(listRes.data.pagination?.total || 0);
      } catch (err) {
        console.error("Failed to load feedback:", err);
      } finally {
        setLoadingFeedback(false);
      }
    };
    fetchFeedbackData();
  }, [activeTab, storeData?.sellerId, feedbackPage]);

  if (loading) return <MainLayout><div className="text-center py-20">Loading store...</div></MainLayout>;
  if (error || !storeData) return <MainLayout><div className="text-center py-20 text-red-500">{error}</div></MainLayout>;

  return (
    <MainLayout>
      <div className="bg-white min-h-screen pb-20 font-sans text-[#191919]">
        {/* Banner Section */}
        <div className="w-full bg-gray-100 flex justify-center">
          <div className="w-full max-w-[1200px] h-[270px] bg-white overflow-hidden">
            {storeData.bannerImageURL ? (
              <img
                src={resolveImageUrl(storeData.bannerImageURL)}
                alt="Store Banner"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://placehold.co/1200x270?text=Banner+Error";
                }}
              />
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
                <img src={resolveImageUrl(storeData.logoUrl)} alt="Store Logo" className="w-full h-full object-cover" />
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
                <div>
                  <span className="font-bold text-black">
                    {storeData.positiveFeedbackPercent !== undefined ? `${storeData.positiveFeedbackPercent}%` : "0%"}
                  </span> Positive feedback
                </div>
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
                <button onClick={() => setActiveTab("about")} className="text-blue-600 hover:underline mt-1">Learn more</button>
              )}
            </div>
          </div>

          {/* Navigation & Search Row */}
          <div className="flex flex-col md:flex-row items-center justify-between py-4 border-b border-gray-200">
            <div className="flex gap-6 text-[14px]">
              <span
                onClick={() => setActiveTab("shop")}
                className={`pb-[18px] -mb-[19px] cursor-pointer hover:text-black transition-colors ${
                  activeTab === "shop" ? "font-bold border-b-2 border-black" : "text-gray-600"
                }`}
              >
                Shop
              </span>
              <span
                onClick={() => setActiveTab("about")}
                className={`pb-[18px] -mb-[19px] cursor-pointer hover:text-black transition-colors ${
                  activeTab === "about" ? "font-bold border-b-2 border-black" : "text-gray-600"
                }`}
              >
                About
              </span>
              <span
                onClick={() => setActiveTab("feedback")}
                className={`pb-[18px] -mb-[19px] cursor-pointer hover:text-black transition-colors ${
                  activeTab === "feedback" ? "font-bold border-b-2 border-black" : "text-gray-600"
                }`}
              >
                Feedback
              </span>
            </div>

            {activeTab === "shop" && (
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
            )}
          </div>

          {/* Main Content Area */}
          <div className="w-full mt-6">
            {activeTab === "shop" && (
              <>
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
                              <img src={resolveImageUrl(cat.imageUrl)} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
                        <Link to={`/products/${item._id}`} key={item._id} className="group cursor-pointer flex flex-col">
                          <div className="w-full aspect-square bg-[#f5f5f5] rounded-xl flex items-center justify-center overflow-hidden mb-3">
                            {item.images && item.images.length > 0 ? (
                              <img
                              src={resolveImageUrl(item.images[0])}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "https://placehold.co/300x300?text=No+Image";
                              }}
                            />
                            ) : (
                              <span className="text-gray-400 text-sm">No image</span>
                            )}
                          </div>
                          <h3 className="text-[14px] text-gray-800 line-clamp-2 mb-1 group-hover:underline">{item.title}</h3>
                          <div className="text-[16px] font-bold mb-1">${item.price.toFixed(2)}</div>
                          <div className="text-[12px] text-gray-500">
                            {item.shippingCost === 0 ? "Free shipping" : (item.shippingCost ? `+$${item.shippingCost.toFixed(2)} shipping` : "Shipping calculated at checkout")}
                          </div>
                        </Link>
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
                      <Link to={`/products/${item._id}`} key={item._id} className="group cursor-pointer flex flex-col">
                        <div className="w-full aspect-square bg-[#f5f5f5] rounded-xl flex items-center justify-center overflow-hidden mb-3">
                          {item.images && item.images.length > 0 ? (
                            <img
                              src={resolveImageUrl(item.images[0])}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "https://placehold.co/300x300?text=No+Image";
                              }}
                            />
                          ) : (
                            <span className="text-gray-400 text-sm">No image</span>
                          )}
                        </div>
                        <h3 className="text-[14px] text-gray-800 line-clamp-2 mb-1 group-hover:underline">{item.title}</h3>
                        <div className="text-[16px] font-bold mb-1">${item.price.toFixed(2)}</div>
                        <div className="text-[12px] text-gray-500">
                          {item.shippingCost === 0 ? "Free shipping" : (item.shippingCost ? `+$${item.shippingCost.toFixed(2)} shipping` : "Shipping calculated at checkout")}
                        </div>
                      </Link>
                    ))}
                  </div>

                  {filteredListings.length === 0 && (
                    <div className="py-20 text-center text-gray-500 border border-dashed border-gray-300 rounded-xl bg-gray-50 mt-4">
                      {searchTerm ? `No results found for "${searchTerm}".` : "This store has no active items."}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "about" && (
              <div className="py-6 min-h-[300px]">
                {(storeData.storyTitle || storeData.storyText || storeData.storyImageUrl) ? (
                  <div className="mb-10 flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/2">
                      {storeData.storyTitle && <h3 className="text-[22px] font-bold mb-4">{storeData.storyTitle}</h3>}
                      {storeData.storyText && <p className="text-[15px] text-gray-700 whitespace-pre-line leading-relaxed">{storeData.storyText}</p>}
                    </div>
                    {storeData.storyImageUrl && (
                      <div className="md:w-1/2 rounded-xl overflow-hidden bg-gray-100 max-h-[350px]">
                        <img src={resolveImageUrl(storeData.storyImageUrl)} alt="Store Story" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 mb-8">Welcome to our store! We value customer satisfaction above all.</p>
                )}

                {storeData.policies && storeData.policies.length > 0 ? (
                  <div className="bg-[#f5f5f5] rounded-xl p-8 mt-6">
                    <h2 className="text-[20px] font-bold mb-6">Store Policies</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                      {storeData.policies.map((policy, index) => (
                        <div key={index} className="bg-white p-5 rounded-lg border border-gray-200">
                          <h4 className="font-bold mb-3 text-[14px] text-black border-b pb-2">{policy.name}</h4>
                          <p className="text-[13px] text-gray-700 whitespace-pre-line leading-relaxed">{policy.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === "feedback" && (
              <div className="py-6 min-h-[300px]">
                {loadingFeedback && feedbackList.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 font-semibold">Loading feedback...</div>
                ) : (
                  <div>
                    {/* Stats Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="border rounded-xl p-6 bg-white flex flex-col justify-center items-center">
                        <span className="text-[13px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Positive Feedback</span>
                        <span className="text-3xl font-bold text-green-600">
                          {feedbackStats?.positiveRate !== undefined ? `${feedbackStats.positiveRate}%` : "0%"}
                        </span>
                      </div>

                      <div className="border rounded-xl p-6 bg-white">
                        <span className="text-[13px] text-gray-500 uppercase tracking-wider font-semibold mb-3 block text-center">Feedback Ratings</span>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-1.5 font-medium">🟢 Positive</span>
                            <span className="font-bold text-green-600">{feedbackStats?.positiveCount || 0}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-1.5 font-medium">🟡 Neutral</span>
                            <span className="font-bold text-gray-600">{feedbackStats?.neutralCount || 0}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-1.5 font-medium">🔴 Negative</span>
                            <span className="font-bold text-red-600">{feedbackStats?.negativeCount || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-xl p-6 bg-white flex flex-col justify-center items-center">
                        <span className="text-[13px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Leave Feedback</span>
                        {user ? (
                          storeData?.sellerId && user._id === storeData.sellerId ? (
                            <span className="text-sm text-gray-400 italic">This is your store</span>
                          ) : (
                            <button
                              onClick={() => setIsFeedbackModalOpen(true)}
                              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-sm transition shadow"
                            >
                              Leave Seller Feedback
                            </button>
                          )
                        ) : (
                          <span className="text-sm text-gray-500 text-center">
                            Please log in to leave seller feedback
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Feedback Comments List */}
                    <div>
                      <h3 className="text-lg font-bold mb-4">Recent Feedback Comments ({feedbackTotal})</h3>
                      {feedbackList.length === 0 ? (
                        <p className="text-gray-500 text-center py-10 border rounded-xl bg-gray-50 border-dashed">
                          No feedback left for this seller yet.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {feedbackList.map((fb) => (
                            <div key={fb._id} className="border rounded-xl p-5 bg-white shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {fb.rating === "positive" ? "🟢" : fb.rating === "neutral" ? "🟡" : "🔴"}
                                  </span>
                                  <span className="text-sm font-semibold capitalize">
                                    {fb.rating}
                                  </span>
                                  <span className="text-gray-400 text-xs">|</span>
                                  <span className="text-sm text-gray-700 font-medium">
                                    {fb.buyerId ? `${fb.buyerId.firstName || ""} ${fb.buyerId.lastName || ""}`.trim() || fb.buyerId.username : "Anonymous"}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(fb.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{fb.comment}</p>

                              {fb.sellerResponse?.message && (
                                <div className="bg-gray-50 border-l-4 border-blue-500 p-3 mt-3 rounded-r-lg">
                                  <span className="text-xs font-bold text-blue-900 block mb-1">Reply from seller:</span>
                                  <p className="text-sm text-gray-700">{fb.sellerResponse.message}</p>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Pagination */}
                          {feedbackTotalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                              <button
                                disabled={feedbackPage === 1}
                                onClick={() => setFeedbackPage(p => p - 1)}
                                className="px-3 py-1.5 border rounded disabled:opacity-50 text-sm hover:bg-gray-50 font-semibold"
                              >
                                Previous
                              </button>
                              <span className="px-3 py-1.5 text-sm text-gray-600 font-medium">
                                Page {feedbackPage} of {feedbackTotalPages}
                              </span>
                              <button
                                disabled={feedbackPage === feedbackTotalPages}
                                onClick={() => setFeedbackPage(p => p + 1)}
                                className="px-3 py-1.5 border rounded disabled:opacity-50 text-sm hover:bg-gray-50 font-semibold"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isFeedbackModalOpen && storeData?.sellerId && (
        <LeaveSellerFeedbackModal
          sellerId={storeData.sellerId}
          storeName={storeData.storeName}
          storeLogo={storeData.logoUrl}
          onClose={() => setIsFeedbackModalOpen(false)}
          onCreated={() => {
            setIsFeedbackModalOpen(false);
            // Trigger feedback refresh by resetting the page or tab
            setFeedbackPage(1);
            setActiveTab("feedback");
            // To update positive rate on storefront header
            apiClient.get(`/store/public/${slug}`).then(res => {
              if (res.data.success) {
                setStoreData(res.data.store);
              }
            });
          }}
        />
      )}
    </MainLayout>
  );
}

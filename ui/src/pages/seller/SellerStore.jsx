import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BsInfoCircleFill, BsPencil, BsArrowLeft, BsArrowRight, BsTrash, BsGripVertical, BsSearch, BsX, BsCamera } from "react-icons/bs";
import { FiPlus } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { resolveImageUrl, API_BASE_URL } from "../../utils/image";

const API_BASE = API_BASE_URL;

export default function SellerStore() {
  const navigate = useNavigate();
  const [storeDraft, setStoreDraft] = useState({
    storeName: "Store Name",
    description: "",
    logoUrl: "",
    bannerImageURL: "",
    categoryType: "Store",
    featuredListingsType: "Manual",
    featuredListingsRow: "Featured items",
    featuredCategories: [],
    storyTitle: "",
    storyText: "",
    storyImageUrl: "",
    policies: []
  });
  const [storeSlug, setStoreSlug] = useState("");
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState("Stage your store");
  const [storeCategories, setStoreCategories] = useState([]);
  const [sellerListings, setSellerListings] = useState([]);
  const [showAllListings, setShowAllListings] = useState(false);
  const [descError, setDescError] = useState("");

  // Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [tempSelectedCategories, setTempSelectedCategories] = useState([]);

  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  
  // Drag & Drop
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Category Image Upload
  const categoryImageRef = useRef(null);
  const [uploadingCategoryIndex, setUploadingCategoryIndex] = useState(null);

  const storyImageRef = useRef(null);
  const [policyDropdownOpen, setPolicyDropdownOpen] = useState(false);
  const [selectedPolicyToAdd, setSelectedPolicyToAdd] = useState("Return");

  const AVAILABLE_POLICIES = [
    "Shipping",
    "Return",
    "Payment",
    "Warranty",
    "Data Privacy Policy",
    "Other policies"
  ];

  useEffect(() => {
    fetchStoreData();
    fetchCategories();
    fetchListings();
  }, []);

  const fetchStoreData = async () => {
    try {
      const res = await apiClient.get("/store");
      if (res.data.success && res.data.store) {
        setStoreDraft(res.data.store.draft || res.data.store.published || {});
        setStoreSlug(res.data.store.slug || "");
        setHasUnpublishedChanges(res.data.store.hasUnpublishedChanges);
      }
    } catch (err) {
      console.error("Error fetching store data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get("/store/categories");
      if (res.data.success) {
        setStoreCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Error fetching categories", err);
    }
  };

  const fetchListings = async () => {
    try {
      const res = await apiClient.get("/listings/seller");
      if (res.data.success) {
        setSellerListings(res.data.listings);
      }
    } catch (err) {
      console.error("Error fetching listings", err);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await apiClient.post("/store/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        const fullUrl = res.data.url.startsWith("http") ? res.data.url : `${API_BASE}${res.data.url}`;
        updateDraft(type === "logo" ? { logoUrl: fullUrl } : { bannerImageURL: fullUrl });
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("Error uploading image");
    }
  };

  const handleCategoryFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await apiClient.post("/store/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        const fullUrl = res.data.url.startsWith("http") ? res.data.url : `${API_BASE}${res.data.url}`;
        let _featured = [...(storeDraft.featuredCategories || [])];
        _featured[uploadingCategoryIndex].imageUrl = fullUrl;
        updateDraft({ featuredCategories: _featured });
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("Error uploading image");
    }
    // clear input
    e.target.value = null;
  };

  const handleStoryFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await apiClient.post("/store/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        const fullUrl = res.data.url.startsWith("http") ? res.data.url : `${API_BASE}${res.data.url}`;
        updateDraft({ storyImageUrl: fullUrl });
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("Error uploading image");
    }
    e.target.value = null;
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    let _featured = [...(storeDraft.featuredCategories || [])];
    const draggedItemContent = _featured.splice(dragItem.current, 1)[0];
    _featured.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    updateDraft({ featuredCategories: _featured });
  };

  const handleOpenModal = () => {
    setTempSelectedCategories(storeDraft.featuredCategories ? storeDraft.featuredCategories.map(c => c.categoryId) : []);
    setModalSearchQuery("");
    setIsCategoryModalOpen(true);
  };

  const handleToggleModalCategory = (cat) => {
    if (tempSelectedCategories.includes(cat._id)) {
      setTempSelectedCategories(tempSelectedCategories.filter(id => id !== cat._id));
    } else {
      if (tempSelectedCategories.length < 6) {
        setTempSelectedCategories([...tempSelectedCategories, cat._id]);
      }
    }
  };

  const handleApplyModalSelection = () => {
    let _featured = [...(storeDraft.featuredCategories || [])];
    
    // Remove unselected
    _featured = _featured.filter(f => tempSelectedCategories.includes(f.categoryId));
    
    // Add newly selected
    tempSelectedCategories.forEach(id => {
      if (!_featured.find(f => f.categoryId === id)) {
        const cat = storeCategories.find(c => c._id === id);
        if (cat) {
          _featured.push({
            categoryId: cat._id,
            name: cat.name,
            imageUrl: ""
          });
        }
      }
    });

    updateDraft({ featuredCategories: _featured });
    setIsCategoryModalOpen(false);
  };

  const handleRemoveFeaturedCategory = (index) => {
    let _featured = [...(storeDraft.featuredCategories || [])];
    _featured.splice(index, 1);
    updateDraft({ featuredCategories: _featured });
  };

  const updateDraft = async (updates) => {
    const newDraft = { ...storeDraft, ...updates };
    setStoreDraft(newDraft);
    setHasUnpublishedChanges(true);

    try {
      await apiClient.put("/store/draft", { draft: newDraft });
    } catch (err) {
      console.error("Error saving draft", err);
    }
  };

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    if (val.length > 1000) return;
    
    // Basic URL check (blocking http, https, www)
    const urlPattern = /(http|https|www\.)/i;
    if (urlPattern.test(val)) {
      setDescError("Links or URLs are not allowed in the store description.");
    } else {
      setDescError("");
    }
    
    updateDraft({ description: val });
  };

  const handlePublish = async () => {
    if (descError) {
      alert("Please fix the errors before publishing.");
      return;
    }
    try {
      const res = await apiClient.post("/store/publish");
      setHasUnpublishedChanges(false);
      if (res.data.store && res.data.store.slug) {
        setStoreSlug(res.data.store.slug);
        navigate(`/store/${res.data.store.slug}`);
      }
    } catch (err) {
      console.error("Error publishing", err);
    }
  };

  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard all unpublished changes?")) {
      fetchStoreData(); 
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading store data...</div>;
  }

  return (
    <div className="flex w-full min-h-[800px] mt-4 relative pb-24">
      {/* Sidebar Navigation */}
      <div className="w-56 flex-shrink-0 pr-6 border-r border-gray-100 hidden md:block">
        <ul className="text-[13px] text-gray-700 space-y-5">
          <li className="font-bold text-black border-l-[3px] border-black pl-3 -ml-[3px] cursor-pointer">
            Edit store
          </li>
          <li>
            <Link to="/seller/storecategories" className="hover:underline cursor-pointer block">Store categories</Link>
          </li>
          <li className="hover:underline cursor-pointer">Store newsletter</li>
          <li className="hover:underline cursor-pointer">Subscriber discounts</li>
          <li className="hover:underline cursor-pointer">Manage subscription</li>
          <li className="pt-8 hover:underline cursor-pointer">Learning resources</li>
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow pl-0 md:pl-8">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-[22px] font-bold text-gray-900">Edit store</h2>
          <div className="text-[13px] text-[#3665f3] flex gap-2">
            <span className="hover:underline cursor-pointer">Store help</span>
            <span className="text-gray-400">|</span>
            <span className="hover:underline cursor-pointer">Give us feedback</span>
            <span className="text-gray-400">|</span>
            {storeSlug ? (
              <Link to={`/store/${storeSlug}`} target="_blank" className="hover:underline cursor-pointer">Visit store</Link>
            ) : (
              <span className="text-gray-400 cursor-not-allowed" title="Publish your store first to view it">Visit store</span>
            )}
          </div>
        </div>
        
        <p className="text-[13px] text-gray-600 mb-6 w-3/4 leading-relaxed">
          In just a few clicks, customize your eBay Store to reflect your unique brand and highlight what you sell.<br/>
          View our <span className="text-[#3665f3] hover:underline cursor-pointer">Image Guide</span> for tools like <span className="text-[#3665f3] hover:underline cursor-pointer">VistaCreate</span> to design professional looking store images and videos in minutes.
        </p>

        {/* Alert Box */}
        {hasUnpublishedChanges && (
          <div className="bg-[#1f51e5] text-white p-4 rounded-sm flex gap-4 items-start mb-6 shadow-sm">
            <BsInfoCircleFill className="text-white mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h4 className="font-bold text-[14px]">The following items need your attention.</h4>
              <p className="text-[13px] mt-0.5">You have unpublished changes. Remember to click the Publish button to apply these changes to your store.</p>
            </div>
          </div>
        )}

        {/* Store Editor Mockup Container */}
        <div className="bg-[#f7f7f7] rounded-t-lg p-6 border border-gray-200 border-b-0">
          
          {/* Billboard */}
          <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
          <div 
            onClick={() => bannerInputRef.current.click()}
            className="bg-white rounded-lg border border-dashed border-gray-300 h-64 flex flex-col items-center justify-center text-center hover:bg-gray-50 cursor-pointer transition-colors shadow-sm mb-6 relative overflow-hidden"
          >
            {storeDraft.bannerImageURL ? (
              <img src={resolveImageUrl(storeDraft.bannerImageURL)} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <>
                <FiPlus size={24} className="text-[#3665f3] mb-2" />
                <span className="text-[14px] text-[#3665f3] font-medium hover:underline">Add billboard image</span>
                <p className="text-[12px] text-gray-500 mt-3 max-w-sm">
                  Use an image that embraces your unique brand and inventory<br/>
                  Image requirements: 1280 x 290 pixels, 12 MB file limit
                </p>
              </>
            )}
          </div>

          {/* Bottom Section: Logo, Name, Progress */}
          <div className="flex gap-8 items-start">
            
            {/* Logo */}
            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
            <div 
              onClick={() => logoInputRef.current.click()}
              className="bg-white rounded-lg border border-dashed border-gray-300 w-32 h-32 flex flex-col items-center justify-center text-center hover:bg-gray-50 cursor-pointer transition-colors shadow-sm flex-shrink-0 relative overflow-hidden"
            >
              {storeDraft.logoUrl ? (
                <img src={resolveImageUrl(storeDraft.logoUrl)} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <>
                  <FiPlus size={20} className="text-[#3665f3] mb-1" />
                  <span className="text-[13px] text-[#3665f3] font-medium hover:underline">Add logo</span>
                </>
              )}
            </div>

            {/* Store Name & Progress */}
            <div className="flex-grow flex justify-between pt-2">
              
              <div className="flex items-center gap-2 h-fit">
                {isEditingName ? (
                  <input 
                    type="text" 
                    value={storeDraft.storeName}
                    onChange={(e) => updateDraft({ storeName: e.target.value })}
                    onBlur={() => setIsEditingName(false)}
                    autoFocus
                    className="text-xl font-bold border-b border-gray-400 focus:outline-none focus:border-[#3665f3]"
                  />
                ) : (
                  <>
                    <span className="text-xl font-bold">{storeDraft.storeName || "Store Name"}</span>
                    <BsPencil onClick={() => setIsEditingName(true)} className="text-gray-500 cursor-pointer hover:text-gray-800" size={14} />
                  </>
                )}
              </div>

              <div className="w-[320px]">
                <div className="flex justify-between items-center text-[13px] mb-2">
                  <span className="font-bold text-gray-800">Start customizing: <span className="text-[#3665f3] font-normal hover:underline cursor-pointer">2/8 tasks completed</span></span>
                </div>
                <div className="w-full bg-gray-300 h-1.5 rounded-full mb-3">
                  <div className="bg-[#3665f3] h-1.5 rounded-full" style={{ width: '25%' }}></div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-sm p-3 text-[12px] flex items-center justify-between shadow-sm">
                  <BsArrowLeft className="text-gray-400 cursor-pointer hover:text-gray-800" />
                  <p className="text-center text-gray-600 px-2 leading-relaxed">
                    Be memorable. <span className="text-[#3665f3] hover:underline cursor-pointer">Add a Store logo.</span> Stores with a logo have up to 26% more conversion.
                  </p>
                  <BsArrowRight className="text-gray-600 cursor-pointer hover:text-gray-800" />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Store Tabs and Lower Content */}
        <div className="bg-white border border-gray-200 border-t-0 rounded-b-lg p-6">
          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-gray-200 pb-0 mb-8 text-[14px]">
            <div 
              onClick={() => setActiveTab("Stage your store")}
              className={`pb-2 cursor-pointer ${activeTab === "Stage your store" ? "font-bold border-b-[3px] border-black" : "text-gray-500 hover:underline"}`}
            >
              Stage your store
            </div>
            <div 
              onClick={() => setActiveTab("Tell your story")}
              className={`pb-2 cursor-pointer ${activeTab === "Tell your story" ? "font-bold border-b-[3px] border-black" : "text-gray-500 hover:underline"}`}
            >
              Tell your story
            </div>
          </div>

          {activeTab === "Stage your store" && (
            <>
              {/* Featured categories */}
              <div className="mb-10 relative">
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Featured categories</h3>
                <p className="text-[13px] text-gray-600 mb-4">
                  Choose from the eBay categories that you linked to your listings, or create custom <span className="text-[#3665f3] hover:underline cursor-pointer">store categories</span> to spotlight what you do best. <span className="text-[#3665f3] hover:underline cursor-pointer">Learn more</span>
                </p>
                
                <div className="flex items-center gap-6 mb-4 text-[13px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="categoryType" checked={storeDraft.categoryType === 'eBay'} onChange={() => updateDraft({ categoryType: 'eBay' })} className="w-4 h-4 cursor-pointer" />
                    <span>eBay categories</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="categoryType" checked={storeDraft.categoryType === 'Store'} onChange={() => updateDraft({ categoryType: 'Store' })} className="w-4 h-4 cursor-pointer" />
                    <span>Store categories</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 text-[13px] text-gray-700 mb-6">
                  <BsInfoCircleFill className="text-[#3665f3]" />
                  <span>One or more categories contain 0 listings. Link listings to categories <span className="underline cursor-pointer">here</span>.</span>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex gap-4 items-center justify-between mb-2">
                    <div className="flex gap-4 items-center">
                      <h4 className="font-bold text-[14px]">Featured categories</h4>
                      <div className="text-[12px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{(storeDraft.featuredCategories || []).length} of 6 selected</div>
                    </div>
                    <button onClick={handleOpenModal} className="px-5 py-1.5 rounded-full bg-white border border-[#3665f3] text-[#3665f3] text-[13px] font-bold hover:bg-blue-50">
                      Add categories
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-4 relative">
                    {/* Hidden input for category image upload */}
                    <input type="file" ref={categoryImageRef} className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleCategoryFileUpload} />
                    
                    {(storeDraft.featuredCategories || []).map((cat, i) => (
                      <div 
                        key={cat.categoryId} 
                        className="flex flex-col gap-2 relative group cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-300 rounded-lg p-2 transition-all bg-white hover:shadow-sm"
                        draggable
                        onDragStart={() => dragItem.current = i}
                        onDragEnter={() => dragOverItem.current = i}
                        onDragEnd={handleSort}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {/* Drag handle & Delete */}
                        <div className="absolute top-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-gradient-to-b from-black/20 to-transparent p-1 rounded-t-lg">
                          <BsGripVertical className="text-white cursor-grab" />
                          <BsTrash 
                            className="text-white cursor-pointer hover:text-red-400" 
                            title="Remove" 
                            onClick={() => handleRemoveFeaturedCategory(i)} 
                          />
                        </div>

                        <div 
                          onClick={() => {
                            setUploadingCategoryIndex(i);
                            categoryImageRef.current.click();
                          }}
                          className="bg-[#f7f7f7] rounded-lg aspect-square flex flex-col items-center justify-center text-center hover:bg-gray-100 cursor-pointer transition-colors shadow-sm relative overflow-hidden"
                        >
                          {cat.imageUrl ? (
                            <div className="w-full h-full relative group/img">
                              <img src={resolveImageUrl(cat.imageUrl)} alt={cat.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <BsCamera size={24} className="text-white" />
                              </div>
                            </div>
                          ) : (
                            <>
                              <BsCamera size={24} className="text-[#3665f3] mb-1" />
                              <span className="text-[12px] text-[#3665f3] font-medium hover:underline">Add image</span>
                            </>
                          )}
                        </div>
                        <div className="w-full text-center text-[12px] font-medium text-gray-800 break-words line-clamp-2" title={cat.name}>
                          {cat.name}
                        </div>
                      </div>
                    ))}

                    {/* Empty Slots */}
                    {Array.from({ length: Math.max(0, 6 - (storeDraft.featuredCategories || []).length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="flex flex-col gap-2 p-2">
                        <div className="bg-white border border-dashed border-gray-300 rounded-lg aspect-square flex flex-col items-center justify-center text-center text-gray-400">
                          <FiPlus size={24} />
                        </div>
                        <div className="w-full h-4 bg-gray-100 rounded-sm mt-1"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feature your listings */}
              <div className="mb-10">
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Feature your listings</h3>
                <p className="text-[13px] text-gray-600 mb-4">
                  Add up to 4 featured listing rows to highlight listings on your storefront. <span className="text-[#3665f3] hover:underline cursor-pointer">Learn more</span>
                </p>
                <div className="flex gap-4 mb-6">
                  <select 
                    value={storeDraft.featuredListingsType}
                    onChange={(e) => updateDraft({ featuredListingsType: e.target.value })}
                    className="border border-gray-400 rounded-full px-4 py-1.5 text-[14px] bg-white focus:outline-none focus:border-blue-500 w-64"
                  >
                    <option value="Manual">Type: Manual</option>
                    <option value="Auto">Type: Automated</option>
                  </select>
                  <select 
                    value={storeDraft.featuredListingsRow}
                    onChange={(e) => updateDraft({ featuredListingsRow: e.target.value })}
                    className="border border-gray-400 rounded-full px-4 py-1.5 text-[14px] bg-white focus:outline-none focus:border-blue-500 w-64"
                  >
                    <option value="Featured items">Row: Featured items</option>
                    <option value="Newly listed">Row: Newly listed</option>
                  </select>
                  <button className="px-6 py-1.5 rounded-full border border-gray-400 text-[#3665f3] text-[14px] font-bold hover:bg-gray-50">
                    Add row
                  </button>
                </div>
                
                {/* Automated Preview */}
                {storeDraft.featuredListingsType === "Auto" && sellerListings.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-[14px] font-bold text-gray-800 mb-3">Preview ({storeDraft.featuredListingsRow}):</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {sellerListings.slice(0, 4).map(listing => (
                        <div key={listing._id} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="aspect-square bg-gray-100 rounded-md mb-2 overflow-hidden flex items-center justify-center">
                            {listing.images && listing.images.length > 0 ? (
                              <img
                  src={resolveImageUrl(listing.images[0])}
                  alt={listing.title}
                  className="object-cover w-full h-full bg-gray-100"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://placehold.co/300x300?text=No+Image";
                  }}
                />
                            ) : (
                              <span className="text-gray-400 text-xs">No image</span>
                            )}
                          </div>
                          <div className="text-[12px] text-gray-800 line-clamp-2 font-medium" title={listing.title}>{listing.title}</div>
                          <div className="text-[14px] font-bold mt-1">${listing.price.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {storeDraft.featuredListingsType === "Auto" && sellerListings.length === 0 && (
                  <div className="text-[13px] text-gray-500 italic mt-4">No listings available for automated preview.</div>
                )}
              </div>

              {/* Use a marketing banner */}
              <div className="mb-10">
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Use a marketing banner</h3>
                <p className="text-[13px] text-gray-600 mb-4">
                  Drive customers to promotions, featured items, or categories in your store with a clickable banner. <span className="text-[#3665f3] hover:underline cursor-pointer">Learn more</span>
                </p>
                <button className="px-6 py-1.5 rounded-full border border-gray-400 text-[#3665f3] text-[14px] font-bold hover:bg-gray-50">
                  Add a banner
                </button>
              </div>

              <div className="border-t border-gray-200 my-8"></div>

              {/* All listings */}
              <div className="mb-12">
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">All listings</h3>
                <p className="text-[13px] text-gray-600 mb-6">
                  All your inventory will be displayed here.
                </p>
                
                {sellerListings.length > 0 ? (
                  <div className="grid grid-cols-5 gap-4">
                    {(showAllListings ? sellerListings : sellerListings.slice(0, 10)).map(listing => (
                      <div key={listing._id} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-gray-100 rounded-md mb-2 overflow-hidden flex items-center justify-center">
                          {listing.images && listing.images.length > 0 ? (
                            <img
                  src={resolveImageUrl(listing.images[0])}
                  alt={listing.title}
                  className="object-cover w-full h-full bg-gray-100"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://placehold.co/300x300?text=No+Image";
                  }}
                />
                          ) : (
                            <span className="text-gray-400 text-xs">No image</span>
                          )}
                        </div>
                        <div className="text-[12px] text-gray-800 line-clamp-2 font-medium" title={listing.title}>{listing.title}</div>
                        <div className="text-[14px] font-bold mt-1 text-gray-900">${listing.price.toFixed(2)}</div>
                        <div className="text-[11px] text-gray-500 mt-1">{listing.condition}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-[14px]">
                    You don't have any active listings yet.
                  </div>
                )}
                {sellerListings.length > 10 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowAllListings((prev) => !prev)}
                      className="text-[13px] text-[#3665f3] hover:underline cursor-pointer font-bold bg-transparent border-none p-0"
                    >
                      {showAllListings
                        ? "Show less"
                        : `See all ${sellerListings.length} listings`}
                    </button>
                  </div>
                )}
              </div>

              {/* Category Preference */}
              <div className="mb-12">
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Category Preference</h3>
                <p className="text-[13px] text-gray-600 mb-4">
                  Select the category type you would like to display on your store.
                </p>
                <div className="flex flex-col gap-3 text-[13px]">
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input type="radio" name="storeCategoryPref" className="w-4 h-4 cursor-pointer" />
                    <span>eBay categories</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input type="radio" name="storeCategoryPref" defaultChecked className="w-4 h-4 cursor-pointer" />
                    <span>Store categories</span>
                    <BsInfoCircleFill className="text-gray-500" size={12} />
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === "Tell your story" && (
            <div className="mb-12">
              {/* Store Description */}
              <div className="mb-12 max-w-3xl">
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Store Description</h3>
                <p className="text-[13px] text-gray-600 mb-4">
                  Tell buyers about your brand and what you sell. 
                </p>
                
                <div className="relative">
                  <textarea
                    value={storeDraft.description || ""}
                    onChange={handleDescriptionChange}
                    placeholder="Welcome to my store! We specialize in..."
                    className={`w-full h-40 border rounded-lg p-3 text-[14px] focus:outline-none focus:ring-1 ${descError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#3665f3] focus:border-[#3665f3]'}`}
                  />
                  <div className="absolute bottom-3 right-3 text-[12px] text-gray-500">
                    {(storeDraft.description || "").length} / 1000
                  </div>
                </div>
                {descError && (
                  <p className="text-red-500 text-[12px] mt-2 font-medium">{descError}</p>
                )}
              </div>

              {/* Store Story */}
              <div className="border-t border-gray-200 my-10"></div>
              <div className="mb-12 max-w-5xl">
                <h3 className="text-[18px] font-bold text-gray-900 mb-2">Store Story</h3>
                <p className="text-[13px] text-gray-600 mb-6">
                  Add a title, description, and an image to highlight what makes your store special.
                </p>
                
                <div className="flex gap-10 items-start">
                  {/* Left Column: Text Inputs */}
                  <div className="flex-grow flex flex-col gap-6">
                    <div>
                      <label className="block text-[14px] font-bold text-gray-800 mb-2">Story Title</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={storeDraft.storyTitle || ""}
                          onChange={(e) => {
                            if (e.target.value.length <= 30) updateDraft({ storyTitle: e.target.value });
                          }}
                          placeholder="Our Journey"
                          className="w-full border border-gray-300 rounded-lg p-3 text-[14px] focus:outline-none focus:border-[#3665f3] focus:ring-1 focus:ring-[#3665f3]"
                        />
                        <div className="absolute right-3 top-3 text-[12px] text-gray-500">
                          {(storeDraft.storyTitle || "").length} / 30
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[14px] font-bold text-gray-800 mb-2">Story Text</label>
                      <div className="relative">
                        <textarea
                          value={storeDraft.storyText || ""}
                          onChange={(e) => {
                            if (e.target.value.length <= 400) updateDraft({ storyText: e.target.value });
                          }}
                          placeholder="Share the history of your business, how you started..."
                          className="w-full h-32 border border-gray-300 rounded-lg p-3 text-[14px] focus:outline-none focus:border-[#3665f3] focus:ring-1 focus:ring-[#3665f3]"
                        />
                        <div className="absolute right-3 bottom-3 text-[12px] text-gray-500">
                          {(storeDraft.storyText || "").length} / 400
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Image Uploader */}
                  <div className="w-80 flex-shrink-0 flex flex-col">
                    <label className="block text-[14px] font-bold text-gray-800 mb-2">Story Image</label>
                    <input type="file" ref={storyImageRef} className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleStoryFileUpload} />
                    <div 
                      onClick={() => storyImageRef.current.click()}
                      className="bg-white border border-dashed border-gray-300 rounded-lg aspect-[4/3] flex flex-col items-center justify-center text-center hover:bg-gray-50 cursor-pointer transition-colors relative overflow-hidden group"
                    >
                      {storeDraft.storyImageUrl ? (
                        <div className="w-full h-full relative">
                          <img src={resolveImageUrl(storeDraft.storyImageUrl)} alt="Story" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                            <BsCamera size={28} />
                            <span className="text-[13px] font-medium">Change image</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <FiPlus size={28} className="text-[#3665f3] mb-2" />
                          <span className="text-[13px] text-[#3665f3] font-medium hover:underline">Add image</span>
                          <span className="text-[11px] text-gray-400 mt-2 px-6">Optimal aspect ratio 4:3<br/>Max size 5MB</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Policies */}
              <div className="border-t border-gray-200 my-10"></div>
              <div className="mb-12 max-w-5xl">
                <div className="mb-8">
                  <h3 className="text-[22px] font-bold text-gray-900 mb-2">Store Policies</h3>
                  <p className="text-[14px] text-gray-600">
                    Add store policies that apply to all of your items. These will be displayed on your store for buyers to read. <span className="underline cursor-pointer">Learn more</span>
                  </p>
                </div>
                
                <div className="flex flex-col gap-8 mb-8">
                  {(storeDraft.policies || []).map((policy, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-[16px] font-bold text-gray-900">{policy.name}</label>
                        <button 
                          onClick={() => {
                            const newPolicies = [...storeDraft.policies];
                            newPolicies.splice(index, 1);
                            updateDraft({ policies: newPolicies });
                          }}
                          className="text-gray-600 hover:text-red-600 p-1 bg-gray-100 hover:bg-red-50 rounded transition-colors"
                          title={`Remove ${policy.name}`}
                        >
                          <BsTrash size={18} />
                        </button>
                      </div>
                      <textarea 
                        value={policy.content || ""}
                        onChange={(e) => {
                          if (e.target.value.length <= 4000) {
                            const newPolicies = [...storeDraft.policies];
                            newPolicies[index].content = e.target.value;
                            updateDraft({ policies: newPolicies });
                          }
                        }}
                        placeholder={`${policy.name} Policies!`}
                        className="w-full h-32 bg-[#f7f7f7] border border-gray-200 rounded-md p-4 text-[14px] focus:outline-none focus:border-[#3665f3] focus:ring-1 focus:ring-[#3665f3] resize-y"
                      />
                      <div className="text-right text-[12px] text-gray-500 mt-1">
                        {(policy.content || "").length}/4000
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Policy Controls */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button 
                      onClick={() => setPolicyDropdownOpen(!policyDropdownOpen)}
                      className="border border-gray-400 rounded-full px-4 py-2 text-[14px] text-gray-800 flex items-center justify-between min-w-[160px]"
                    >
                      <span>Select policy: {selectedPolicyToAdd}</span>
                      <svg className={`ml-2 w-4 h-4 transition-transform ${policyDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    
                    {policyDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden z-10 py-1">
                        {AVAILABLE_POLICIES.filter(p => !(storeDraft.policies || []).some(existing => existing.name === p)).map(p => (
                          <div 
                            key={p} 
                            onClick={() => {
                              setSelectedPolicyToAdd(p);
                              setPolicyDropdownOpen(false);
                            }}
                            className="px-4 py-2 text-[14px] hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <span>{p}</span>
                            {selectedPolicyToAdd === p && <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (!(storeDraft.policies || []).some(existing => existing.name === selectedPolicyToAdd)) {
                        const newPolicies = [...(storeDraft.policies || []), { name: selectedPolicyToAdd, content: "" }];
                        updateDraft({ policies: newPolicies });
                        
                        // Auto-select next available policy
                        const remaining = AVAILABLE_POLICIES.filter(p => !newPolicies.some(existing => existing.name === p));
                        if (remaining.length > 0) setSelectedPolicyToAdd(remaining[0]);
                      }
                    }}
                    className="border border-[#3665f3] text-[#3665f3] rounded-full px-6 py-2 text-[14px] font-medium hover:bg-blue-50 transition-colors"
                  >
                    Add policy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      {hasUnpublishedChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-8 flex justify-end gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
          <button onClick={handleDiscard} className="px-5 py-2 rounded-full border border-[#3665f3] text-[#3665f3] text-[14px] font-bold hover:bg-blue-50">
            Discard edits
          </button>
          <button className="px-5 py-2 rounded-full border border-[#3665f3] text-[#3665f3] text-[14px] font-bold hover:bg-blue-50">
            Preview draft
          </button>
          <button onClick={handlePublish} className="px-8 py-2 rounded-full bg-[#3665f3] text-white text-[14px] font-bold hover:bg-blue-700">
            Publish
          </button>
        </div>
      )}

      {/* Category Selection Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[600px] flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-[20px] font-bold">Select featured categories</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500 hover:text-gray-900 rounded-full p-1 hover:bg-gray-100">
                <BsX size={28} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 flex-grow overflow-y-auto">
              <div className="relative mb-6">
                <input 
                  type="text" 
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Search categories" 
                  className="w-full border border-gray-400 rounded-full pl-10 pr-4 py-2 text-[14px] focus:outline-none focus:border-[#3665f3]"
                />
                <BsSearch className="absolute left-4 top-3 text-gray-500" />
              </div>

              <div className="space-y-2">
                {storeCategories
                  .filter(cat => cat.name.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                  .map(cat => {
                    const isSelected = tempSelectedCategories.includes(cat._id);
                    const isDisabled = !isSelected && tempSelectedCategories.length >= 6;
                    return (
                      <label 
                        key={cat._id} 
                        className={`flex items-center gap-3 p-3 rounded-lg border ${isSelected ? 'border-[#3665f3] bg-blue-50' : 'border-transparent hover:bg-gray-50'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} transition-colors`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => handleToggleModalCategory(cat)}
                          className="w-5 h-5 cursor-pointer accent-[#3665f3]"
                        />
                        <span className="text-[14px] font-medium text-gray-800">{cat.name}</span>
                      </label>
                    );
                })}
                {storeCategories.filter(cat => cat.name.toLowerCase().includes(modalSearchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-[14px]">No categories found matching "{modalSearchQuery}"</div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 flex justify-between items-center bg-gray-50">
              <div className="text-[14px] text-gray-600 font-medium">
                Selected: <span className="text-gray-900 font-bold">{tempSelectedCategories.length}/6</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsCategoryModalOpen(false)} className="px-6 py-2 rounded-full border border-gray-400 text-gray-700 text-[14px] font-bold hover:bg-gray-100">
                  Cancel
                </button>
                <button onClick={handleApplyModalSelection} className="px-8 py-2 rounded-full bg-[#3665f3] text-white text-[14px] font-bold hover:bg-blue-700">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

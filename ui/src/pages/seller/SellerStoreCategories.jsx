import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BsInfoCircle } from "react-icons/bs";
import apiClient from "../../services/apiClient";

export default function SellerStoreCategories() {
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get("/store/categories");
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Error fetching categories", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim() === "") return;
    
    try {
      if (editingCategory) {
        // Handle Rename
        await apiClient.put(`/store/categories/${editingCategory._id}`, { name: newCategoryName });
      } else {
        // Handle Add New
        await apiClient.post("/store/categories", { name: newCategoryName });
      }
      await fetchCategories();
    } catch (err) {
      console.error("Error saving category", err);
      alert("Error saving category");
    }
    
    setNewCategoryName("");
    setEditingCategory(null);
    setShowAddModal(false);
  };

  const openRenameModal = (cat) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setShowAddModal(true);
    setOpenDropdownId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await apiClient.delete(`/store/categories/${id}`);
      await fetchCategories();
    } catch (err) {
      console.error("Error deleting category", err);
      alert("Error deleting category");
    }
    setOpenDropdownId(null);
  };

  const toggleDropdown = (id) => {
    if (openDropdownId === id) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(id);
    }
  };

  return (
    <div className="flex w-full min-h-[800px] mt-4 relative pb-24">
      {/* Sidebar Navigation */}
      <div className="w-56 flex-shrink-0 pr-6 border-r border-gray-100 hidden md:block">
        <ul className="text-[13px] text-gray-700 space-y-5">
          <li>
            <Link to="/seller/store" className="hover:underline cursor-pointer block pl-3">Edit store</Link>
          </li>
          <li className="font-bold text-black border-l-[3px] border-black pl-3 -ml-[3px]">
            Store categories
          </li>
          <li>
            <span className="hover:underline cursor-pointer block pl-3">Store newsletter</span>
          </li>
          <li>
            <span className="hover:underline cursor-pointer block pl-3">Subscriber discounts</span>
          </li>
          <li>
            <span className="hover:underline cursor-pointer block pl-3">Manage subscription</span>
          </li>
          <li className="pt-8">
            <span className="hover:underline cursor-pointer block pl-3">Learning resources</span>
          </li>
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow pl-0 md:pl-8">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-[22px] font-bold text-gray-900">Manage Store categories</h2>
          <div className="text-[13px] text-[#3665f3] flex gap-2">
            <span className="hover:underline cursor-pointer">Give us feedback</span>
          </div>
        </div>
        
        <p className="text-[13px] text-gray-600 mb-8 leading-relaxed pr-10">
          You can use Store categories to organize your listings and curate your selection. To learn more about creating effective Store categories, review the <span className="text-[#3665f3] hover:underline cursor-pointer">Store category guidelines</span>. Visit the <span className="text-[#3665f3] hover:underline cursor-pointer">Store Categories FAQs</span> page to learn about frequently asked questions. To manage your listings and the categories in which they appear, go to the <span className="text-[#3665f3] hover:underline cursor-pointer">Active listings</span> page, select the listings that you want to move, and edit them.
        </p>

        {/* Categories Panel */}
        <div className="bg-[#f7f7f7] rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-3">Created categories: {categories.length} of 300</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setEditingCategory(null);
                      setNewCategoryName("");
                      setShowAddModal(true);
                    }}
                    className="px-4 py-1.5 rounded-full border border-gray-400 text-[#3665f3] text-[13px] font-bold hover:bg-white"
                  >
                    Add Store categories
                  </button>
                  <button className="px-6 py-1.5 rounded-full border border-gray-300 text-gray-400 text-[13px] font-bold cursor-not-allowed">
                    Reorder
                  </button>
                </div>
              </div>
              <span className="text-[#3665f3] text-[13px] hover:underline cursor-pointer">Expand all categories</span>
            </div>
          </div>

          <div className="bg-white rounded-b-lg border-t border-gray-200 w-full overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="p-10 text-center">Loading categories...</div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-4 pl-6 font-normal w-32">Actions</th>
                    <th className="py-4 font-normal">Category ({categories.length})</th>
                    <th className="py-4 font-normal text-center">Level</th>
                    <th className="py-4 font-normal text-center">Subcategories</th>
                    <th className="py-4 font-normal text-center">Listings</th>
                    <th className="py-4 pr-6 font-normal text-right flex items-center justify-end gap-1">Category number <BsInfoCircle /></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, i) => (
                    <tr key={cat._id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="py-4 pl-6 text-[#3665f3] relative">
                        <div className="relative">
                          <button 
                            onClick={() => toggleDropdown(cat._id)}
                            className="flex items-center gap-1 hover:underline focus:outline-none"
                          >
                            Edit <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </button>
                          
                          {/* Dropdown Menu */}
                          {openDropdownId === cat._id && (
                            <div className="absolute left-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1">
                              <button 
                                onClick={() => openRenameModal(cat)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                              >
                                Rename
                              </button>
                              <button 
                                onClick={() => setOpenDropdownId(null)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                              >
                                Add subcategory
                              </button>
                              <button 
                                onClick={() => handleDelete(cat._id)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-gray-800">{cat.name}</td>
                      <td className="py-4 text-center text-gray-800">{cat.level}</td>
                      <td className="py-4 text-center text-gray-800">{cat.subcategories}</td>
                      <td className="py-4 text-center text-[#3665f3] hover:underline cursor-pointer">{cat.listings}</td>
                      <td className="py-4 pr-6 text-right text-gray-800">{cat.categoryNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
        <p className="text-gray-500 text-[11px] mt-4">
          *Your listing counts may not be current while we finish processing any category or listing requests you submitted.
        </p>

      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-[450px] p-6 relative">
            <h3 className="text-xl font-bold mb-4">Add Store Category</h3>
            <div className="mb-6">
              <label className="block text-[13px] text-gray-700 mb-2">Category Name</label>
              <input 
                type="text" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full border border-gray-400 rounded-md p-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="e.g. Vintage Watches"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2 rounded-full border border-gray-400 text-gray-700 text-[14px] font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddCategory}
                className="px-5 py-2 rounded-full bg-[#3665f3] text-white text-[14px] font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newCategoryName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

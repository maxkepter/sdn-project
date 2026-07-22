import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopMenu from "../layout/includes/TopMenu";
import MainHeader from "../layout/includes/MainHeader";
import { AuthContext } from "../context/AuthContext";
import { BsPencil, BsSearch } from "react-icons/bs";
import apiClient from "../services/apiClient";

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [aboutMe, setAboutMe] = useState("");
  const [activeTab, setActiveTab] = useState("About");
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get(`/auth/profile/${username}`);
        setProfile(res.data.data);
      } catch (err) {
        console.error("Profile not found", err);
      } finally {
        setLoading(false); // wait, let's look at the original code's variable. Original had: setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (activeTab !== "Feedback" || !profile?._id) return;
    const fetchFeedback = async () => {
      setLoadingFeedback(true);
      try {
        const res = await apiClient.get(`/reviews/sellers/${profile._id}/feedback`);
        setFeedbackStats(res.data);
      } catch (err) {
        console.error("Failed to load profile feedback stats", err);
      } finally {
        setLoadingFeedback(false);
      }
    };
    fetchFeedback();
  }, [activeTab, profile?._id]);

  if (loading) {
    return (
      <div className="min-w-[1050px] max-w-[1300px] mx-auto">
        <TopMenu />
        <MainHeader />
        <div className="p-10 text-center">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-w-[1050px] max-w-[1300px] mx-auto">
        <TopMenu />
        <MainHeader />
        <div className="p-10 text-center text-red-500">Profile not found</div>
      </div>
    );
  }

  const isOwner = currentUser?.username === username;
  const displayName = profile.username;
  const location = profile.country || "Not specified";
  const memberSince = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Unknown";

  const handleSave = async () => {
    // In a real app, send aboutMe to backend
    setIsEditing(false);
  };

  return (
    <div className="min-w-[1050px] max-w-[1300px] mx-auto flex flex-col min-h-screen">
      <TopMenu />
      <MainHeader />
      
      <div className="w-full bg-white font-sans text-[#111820] flex-grow">
        
        {/* Banner Section */}
        <div className="bg-[#f7f7f7] w-full pt-10 pb-6 border-b border-gray-200">
          <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between">
            
            {/* Left: Avatar & Name */}
            <div className="flex flex-col">
              <div className="flex items-center gap-6">
                {/* Avatar placeholder resembling two photos */}
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center relative shadow-sm border border-gray-300">
                  <div className="absolute w-12 h-10 bg-white border-2 border-gray-300 -rotate-12 shadow-sm"></div>
                  <div className="absolute w-12 h-10 bg-white border-2 border-gray-400 rotate-6 shadow-sm"></div>
                  
                  {isEditing && (
                    <div className="absolute top-0 right-0 w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center shadow-sm cursor-pointer hover:bg-gray-50">
                      <BsPencil size={14} />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col">
                  <h1 className="text-3xl font-bold">{displayName}</h1>
                  {isEditing && (
                    <p className="text-[13px] text-gray-700 mt-3">
                      To change your username, visit <br/>
                      <span className="underline cursor-pointer hover:text-gray-900">Account settings</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Edit Profile or Actions */}
            {isOwner && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 hover:underline text-sm font-medium"
              >
                <BsPencil size={14} />
                Edit profile
              </button>
            )}
            
            {isOwner && isEditing && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 rounded-full border border-[#3665f3] text-[#3665f3] text-[15px] font-bold hover:bg-blue-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 rounded-full bg-[#3665f3] text-white text-[15px] font-bold hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation & Search */}
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="flex items-center justify-between border-b border-gray-200 pt-6">
            
            {/* Tabs */}
            <div className="flex items-center gap-8 text-[15px]">
              <div 
                onClick={() => setActiveTab("About")}
                className={`pb-2 cursor-pointer ${activeTab === "About" ? "font-bold border-b-[3px] border-[#111820]" : "text-[#707070] hover:underline"}`}
              >
                About
              </div>
              <div 
                onClick={() => setActiveTab("Feedback")}
                className={`pb-2 cursor-pointer ${activeTab === "Feedback" ? "font-bold border-b-[3px] border-[#111820]" : "text-[#707070] hover:underline"}`}
              >
                Feedback
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-2 w-[300px]">
              <BsSearch className="absolute left-3 top-2.5 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search all items" 
                className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-[1200px] mx-auto px-4 py-8 min-h-[300px]">
          {activeTab === "About" && (
            <>
              <h2 className="text-xl font-bold mb-6">About</h2>
              
              {isEditing ? (
                <div className="mb-8">
                  <p className="text-[13px] text-gray-700 mb-2">
                    Use this space to tell other eBay members about yourself and what you're passionate about. Give people more reasons to follow you!
                  </p>
                  <div className="relative">
                    <textarea
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      maxLength={1000}
                      className="w-full h-32 border border-gray-400 rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                    />
                    <div className="absolute bottom-2 right-3 text-xs text-gray-500">
                      {aboutMe.length}/1000
                    </div>
                  </div>
                </div>
              ) : (
                aboutMe && (
                  <div className="mb-8 text-[14px] text-[#111820] whitespace-pre-wrap">
                    {aboutMe}
                  </div>
                )
              )}
              
              <div className="text-[13px] text-gray-600 space-y-1">
                <p>Location: <span className="font-bold text-black">{location}</span></p>
                <p>Member since: <span className="font-bold text-black">{memberSince}</span></p>
                {profile.store && (
                  <p>Seller profile: <span onClick={() => navigate(`/store/${profile.store.slug}`)} className="font-bold text-black underline cursor-pointer hover:text-blue-600">{profile.store.name}</span></p>
                )}
              </div>
            </>
          )}

          {activeTab === "Feedback" && (
            <>
              <h2 className="text-xl font-bold mb-2">Feedback ratings</h2>
              <p className="text-[13px] text-gray-500 mb-6">Recent Statistics</p>

              {loadingFeedback ? (
                <p className="text-sm text-gray-500">Loading feedback ratings...</p>
              ) : (
                <div className="flex items-center gap-16 text-[13px]">
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-black">🟢 Positive</span>
                    <span className="text-lg font-semibold text-green-600">
                      {feedbackStats?.positiveCount || 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-black">🟡 Neutral</span>
                    <span className="text-lg font-semibold text-gray-600">
                      {feedbackStats?.neutralCount || 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-black">🔴 Negative</span>
                    <span className="text-lg font-semibold text-red-600">
                      {feedbackStats?.negativeCount || 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 ml-4 pl-4 border-l">
                    <span className="font-bold text-black">Positive Rate</span>
                    <span className="text-lg font-bold text-blue-600">
                      {feedbackStats?.positiveRate !== undefined ? `${feedbackStats.positiveRate}%` : "0%"}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 mt-12 py-8 px-4 text-[11px] text-[#707070]">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex gap-4 mb-2 flex-wrap">
              <span className="hover:underline cursor-pointer">About eBay</span>
              <span className="hover:underline cursor-pointer">Announcements</span>
              <span className="hover:underline cursor-pointer">Community</span>
              <span className="hover:underline cursor-pointer">Security Center</span>
              <span className="hover:underline cursor-pointer">Seller Center</span>
              <span className="hover:underline cursor-pointer">Policies</span>
              <span className="hover:underline cursor-pointer">Affiliates</span>
              <span className="hover:underline cursor-pointer">Product Safety Tips</span>
              <span className="hover:underline cursor-pointer">Help & Contact</span>
              <span className="hover:underline cursor-pointer">Site Map</span>
            </div>
            <p>
              Copyright © 1995-2026 eBay Inc. All Rights Reserved.{" "}
              <a href="#" className="underline text-[#3665f3]">Accessibility</a>,{" "}
              <a href="#" className="underline text-[#3665f3]">User Agreement</a>,{" "}
              <a href="#" className="underline text-[#3665f3]">Privacy</a>,{" "}
              <a href="#" className="underline text-[#3665f3]">Consumer Health Data</a>,{" "}
              <a href="#" className="underline text-[#3665f3]">Payments Terms of Use</a>,{" "}
              <a href="#" className="underline text-[#3665f3]">Cookies</a>,{" "}
              <a href="#" className="underline text-[#3665f3]">CA Privacy Notice</a>,{" "}
              <a href="#" className="underline text-[#3665f3]">Your Privacy Choices</a> and{" "}
              <a href="#" className="underline text-[#3665f3]">AdChoice</a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

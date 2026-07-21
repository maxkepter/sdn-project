import React, { useState, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const BecomeSeller = () => {
  const navigate = useNavigate();
  const { upgradeToSeller } = useContext(AuthContext);
  const [country, setCountry] = useState("United States");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [zipError, setZipError] = useState("");

  const stateMap = useMemo(() => ({
    "United States": ["Alabama", "Alaska", "California", "New York", "Texas", "Washington"],
    "Vietnam": ["Hanoi", "Ho Chi Minh City", "Da Nang", "Can Tho", "Hai Phong"],
    "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
    "Canada": ["Alberta", "British Columbia", "Ontario", "Quebec", "Nova Scotia"]
  }), []);

  const zipRegexMap = {
    "United States": { regex: /^\d{5}(-\d{4})?$/, msg: "US Zip Code must be 5 digits (e.g. 90210)" },
    "Vietnam": { regex: /^\d{5,6}$/, msg: "Vietnam Postal Code must be 5-6 digits" },
    "United Kingdom": { regex: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, msg: "Invalid UK Postcode format" },
    "Canada": { regex: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i, msg: "Invalid Canada Postal Code format" }
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!address) return;

    // Validate Zip Code
    const validator = zipRegexMap[country];
    if (validator && !validator.regex.test(zip.trim())) {
      setZipError(validator.msg);
      return;
    }
    setZipError("");
    
    try {
      await upgradeToSeller();
      navigate("/seller");
    } catch (err) {
      console.error("Failed to upgrade to seller", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50/50">
      {/* Minimal Header */}
      <header className="py-4 px-8 border-b border-gray-200 bg-white">
        <div className="cursor-pointer inline-block" onClick={() => navigate("/")}>
          <img width="100" src="/images/logo.svg" alt="eBay Logo" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex justify-center pt-24 px-4 bg-white">
        <div className="w-full max-w-[460px]">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Where are you selling from?</h1>
            <p className="text-gray-700 text-sm mb-6">To continue, we need your contact information.</p>

            <form onSubmit={handleContinue} className="flex flex-col gap-4">
              {/* Country Dropdown */}
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 pt-5 pb-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 appearance-none bg-transparent text-gray-900 text-[15px]"
                  id="country"
                  required
                >
                  {Object.keys(stateMap).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <label htmlFor="country" className="absolute left-4 top-2 text-[11px] text-gray-500">
                  Country or region
                </label>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Address Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Street Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full px-4 pt-5 pb-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-transparent peer text-[15px]"
                  id="address"
                />
                <label htmlFor="address" className="absolute left-4 top-2 text-[11px] text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-3.5 peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-gray-500 bg-white px-1 cursor-text -ml-1">
                  Street Address
                </label>
              </div>

              {/* Conditional Extra Fields */}
              {address.length > 0 && (
                <div className="flex flex-col gap-4 animate-fade-in-down">
                  {/* Street Address 2 */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Street Address 2 (Optional)"
                      className="w-full px-4 pt-5 pb-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-transparent peer text-[15px]"
                      id="address2"
                    />
                    <label htmlFor="address2" className="absolute left-4 top-2 text-[11px] text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-3.5 peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-gray-500 bg-white px-1 cursor-text -ml-1">
                      Street Address 2 (Optional)
                    </label>
                  </div>

                  {/* City */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="City"
                      className="w-full px-4 pt-5 pb-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-transparent peer text-[15px]"
                      id="city"
                      required
                    />
                    <label htmlFor="city" className="absolute left-4 top-2 text-[11px] text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-3.5 peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-gray-500 bg-white px-1 cursor-text -ml-1">
                      City
                    </label>
                  </div>

                  {/* State and Zip Row */}
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <select
                        className="w-full px-4 pt-5 pb-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 appearance-none bg-transparent text-gray-900 text-[15px]"
                        id="state"
                        required
                      >
                        {stateMap[country]?.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <label htmlFor="state" className="absolute left-4 top-2 text-[11px] text-gray-500 bg-white px-1">
                        State or Province or Regi...
                      </label>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Zip Code"
                        value={zip}
                        onChange={(e) => {
                          setZip(e.target.value);
                          if(zipError) setZipError("");
                        }}
                        className={`w-full px-4 pt-5 pb-2 border rounded-lg focus:outline-none focus:ring-1 placeholder-transparent peer text-[15px] ${
                          zipError 
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                            : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"
                        }`}
                        id="zip"
                        required
                      />
                      <label htmlFor="zip" className={`absolute left-4 top-2 text-[11px] transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-2 peer-focus:text-[11px] bg-white px-1 cursor-text -ml-1 ${zipError ? "text-red-500 peer-placeholder-shown:text-red-500 peer-focus:text-red-500" : "text-gray-500 peer-placeholder-shown:text-gray-500 peer-focus:text-gray-500"}`}>
                        Zip Code
                      </label>
                      {zipError && (
                        <p className="text-red-500 text-xs mt-1 absolute -bottom-5 left-1">{zipError}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!address}
                className={`w-full font-semibold py-3 px-4 rounded-full transition-colors duration-200 mt-2 text-[15px] ${
                  address 
                    ? "bg-[#3665f3] hover:bg-blue-700 text-white cursor-pointer" 
                    : "bg-[#3665f3] text-white cursor-pointer" 
                }`}
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 px-4 text-center text-xs text-gray-500 bg-gray-50/50">
        <p className="max-w-4xl mx-auto leading-relaxed">
          Copyright © 1995-2024 eBay Inc. All Rights Reserved.{" "}
          <a href="#" className="underline hover:text-gray-700">Accessibility</a>,{" "}
          <a href="#" className="underline hover:text-gray-700">User Agreement</a>,{" "}
          <a href="#" className="underline hover:text-gray-700">Privacy</a>,{" "}
          <a href="#" className="underline hover:text-gray-700">Consumer Health Data</a>,{" "}
          <a href="#" className="underline hover:text-gray-700">Payments Terms of Use</a>,{" "}
          <a href="#" className="underline hover:text-gray-700">Cookies</a>,{" "}
          <a href="#" className="underline hover:text-gray-700">CA Privacy Notice</a>,{" "}
          <a href="#" className="underline hover:text-gray-700">Your Privacy Choices</a> and{" "}
          <a href="#" className="underline hover:text-gray-700">AdChoice</a>
        </p>
      </footer>
    </div>
  );
};

export default BecomeSeller;

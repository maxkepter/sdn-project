import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { AuthContext } from "../context/AuthContext";

const Register = () => {
  const [accountType, setAccountType] = useState("Personal");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const isFormFilled = firstName && lastName && email && password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormFilled) return;
    try {
      setError("");
      await register(firstName, lastName, email, password, accountType);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="flex justify-between items-center py-6 px-8 max-w-7xl mx-auto w-full">
        {/* eBay Logo */}
        <div className="cursor-pointer" onClick={() => navigate("/")}>
          <img width="100" src="/images/logo.svg" alt="eBay Logo" />
        </div>
        <div className="text-sm text-gray-700">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex justify-center w-full max-w-7xl mx-auto px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row w-full h-[600px] gap-10 xl:gap-20">
          
          {/* Left Side - Image (Hidden on small screens) */}
          <div className="hidden lg:block lg:w-1/2 h-full rounded-3xl overflow-hidden relative">
             <img 
              src="https://i.ebayimg.com/images/g/hiMAAOSwWXtlYHui/s-l1600.webp" 
              alt="People laughing" 
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Right Side - Form */}
          <div className="w-full lg:w-1/2 flex flex-col pt-8 max-w-[420px] mx-auto lg:mx-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Create an account</h1>

            {error && (
              <div className="w-full max-w-[360px] mb-4 text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                {error}
              </div>
            )}

            {/* Account Type Toggle */}
            <div className="flex bg-white rounded-full p-1 border border-gray-400 mb-8 w-full max-w-[360px]">
              <button
                type="button"
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
                  accountType === "Personal" 
                    ? "bg-gray-900 text-white" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setAccountType("Personal")}
              >
                Personal
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
                  accountType === "Business" 
                    ? "bg-gray-900 text-white" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setAccountType("Business")}
              >
                Business
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-[360px]">
              {/* Name Fields Row */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-transparent peer"
                    id="firstName"
                  />
                  <label htmlFor="firstName" className="absolute left-4 top-1 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500 bg-white px-1 cursor-text">
                    First name
                  </label>
                </div>
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-transparent peer"
                    id="lastName"
                  />
                  <label htmlFor="lastName" className="absolute left-4 top-1 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500 bg-white px-1 cursor-text">
                    Last name
                  </label>
                </div>
              </div>

              {/* Email */}
              <div className="relative">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-transparent peer"
                  id="email"
                />
                <label htmlFor="email" className="absolute left-4 top-1 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500 bg-white px-1 cursor-text">
                  Email
                </label>
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-transparent peer"
                  id="password"
                />
                <label htmlFor="password" className="absolute left-4 top-1 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500 bg-white px-1 cursor-text">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>

              {/* Disclaimer */}
              <div className="text-[11px] text-gray-600 leading-tight mt-1">
                By selecting Create {accountType.toLowerCase()} account, you agree to our <a href="#" className="text-blue-600 hover:underline">User Agreement</a> and acknowledge reading our <a href="#" className="text-blue-600 hover:underline">User Privacy Notice</a>.
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormFilled}
                className={`w-full font-semibold py-3 px-4 rounded-full transition-colors duration-200 mt-2 text-[15px] ${
                  isFormFilled 
                    ? "bg-[#3665f3] hover:bg-blue-700 text-white cursor-pointer" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Create {accountType.toLowerCase()} account
              </button>
            </form>

            <div className="w-full max-w-[360px]">
              <div className="flex items-center my-6">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-4 text-gray-600 text-[13px] bg-white z-10 -ml-4 -mr-4 relative">or continue with</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Social Buttons (Side by Side) */}
              <div className="flex justify-between items-center w-full max-w-[280px] mx-auto gap-4">
                <button type="button" className="flex items-center justify-center flex-1 border border-gray-400 rounded-full py-2 hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  <span className="text-gray-900 font-semibold text-sm">Google</span>
                </button>
                
                <button type="button" className="flex items-center justify-center flex-1 border border-gray-400 rounded-full py-2 hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 384 512" fill="currentColor">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                  </svg>
                  <span className="text-gray-900 font-semibold text-sm">Apple</span>
                </button>
                
                <button type="button" className="flex items-center justify-center flex-1 border border-gray-400 rounded-full py-2 hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5 mr-2 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-gray-900 font-semibold text-sm">Facebook</span>
                </button>
              </div>

              <div className="flex items-center mt-6 text-sm text-gray-900 font-medium">
                <input type="checkbox" id="stay-signed-in" className="mr-2 w-4 h-4 accent-black cursor-pointer" defaultChecked />
                <label htmlFor="stay-signed-in" className="cursor-pointer">Stay signed in</label>
                <svg className="w-4 h-4 ml-1 text-gray-500 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="absolute bottom-6 right-6">
        <button className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50 shadow-sm text-lg font-bold shadow-sm">
          ?
        </button>
      </div>
    </div>
  );
};

export default Register;

import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, bypassLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleContinue = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email or username.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await login(email, password || "password"); 
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  const handleBypass = async () => {
    try {
      await bypassLogin();
      navigate("/");
    } catch (err) {
      setError("Bypass failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="flex justify-between items-center py-4 px-6">
        {/* eBay Logo */}
        <div className="cursor-pointer" onClick={() => navigate("/")}>
          <img width="120" src="/images/logo.svg" alt="eBay Logo" />
        </div>
        <div className="text-sm text-gray-600 hover:underline cursor-pointer hidden md:block">
          Tell us what you think
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center pt-8 px-4">
        {step === 1 ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in to your account</h1>
            <div className="text-sm mb-6">
              <span className="text-gray-700">New to eBay? </span>
              <Link to="/register" className="text-blue-600 hover:underline">
                Create account
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
            <div className="text-sm mb-6 flex items-center gap-2">
              <span className="text-gray-700 font-medium">{email}</span>
              <button 
                onClick={() => { setStep(1); setPassword(""); setError(""); }} 
                className="text-blue-600 hover:underline"
                type="button"
              >
                Switch account
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="w-full max-w-[360px] mb-4 text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <div className="w-full max-w-[360px]">
          <form onSubmit={step === 1 ? handleContinue : handleSignIn} className="flex flex-col gap-4">
            {step === 1 ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-transparent peer"
                  id="email"
                />
                <label htmlFor="email" className="absolute left-4 top-1 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500 bg-white px-1 cursor-text">
                  Email or username
                </label>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-transparent peer"
                  id="password"
                  autoFocus
                />
                <label htmlFor="password" className="absolute left-4 top-1 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-500 bg-white px-1 cursor-text">
                  Password
                </label>
              </div>
            )}

            <button
              type="submit"
              className={`w-full text-white font-semibold py-3 px-4 rounded-full transition-colors duration-200 mt-1 ${step === 1 ? 'bg-[#3665f3] hover:bg-blue-700' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
            >
              {step === 1 ? "Continue" : "Sign in"}
            </button>
            
            {step === 2 && (
              <div className="text-center mt-2">
                <button type="button" className="text-sm text-blue-600 hover:underline">
                  Reset your password
                </button>
              </div>
            )}
          </form>

          {step === 1 && (
            <>
              <div className="flex items-center my-6">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-4 text-gray-500 text-sm bg-white z-10 -ml-4 -mr-4 relative">or</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              <div className="flex flex-col gap-3">
                <button type="button" className="flex items-center justify-center w-full border border-gray-400 rounded-full py-2.5 px-4 hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  <span className="text-gray-700 font-medium text-sm">Continue with Google</span>
                </button>
                
                <button type="button" className="flex items-center justify-center w-full border border-gray-400 rounded-full py-2.5 px-4 hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 384 512" fill="currentColor">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                  </svg>
                  <span className="text-gray-700 font-medium text-sm">Continue with Apple</span>
                </button>
                
                <button type="button" className="flex items-center justify-center w-full border border-gray-400 rounded-full py-2.5 px-4 hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5 mr-3 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-gray-700 font-medium text-sm">Continue with Facebook</span>
                </button>
              </div>

              <div className="flex items-center justify-center mt-6 text-sm text-gray-700">
                <input type="checkbox" id="stay-signed-in" className="mr-2 w-4 h-4 accent-[#0064d2] cursor-pointer" defaultChecked />
                <label htmlFor="stay-signed-in" className="cursor-pointer">Stay signed in</label>
                <svg className="w-4 h-4 ml-1 text-gray-500 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </>
          )}

          {/* Dev Bypass */}
          <div className="mt-12 pt-4 border-t border-gray-200">
            <button
              onClick={handleBypass}
              type="button"
              className="w-full bg-gray-100 text-gray-500 py-2 px-4 rounded-full hover:bg-gray-200 transition text-xs font-medium"
            >
              Dev Bypass (Auto Login as Seller)
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-10 py-6 px-4 text-center text-xs text-gray-500 bg-white">
        <p className="max-w-4xl mx-auto leading-relaxed">
          Copyright © 1995-2026 eBay Inc. All Rights Reserved.{" "}
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

export default Login;

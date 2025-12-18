"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = ["Email is required"];
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = ["Email is invalid"];
    }

    if (!password) {
      newErrors.password = ["Password is required"];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // CSRF protection if using Laravel Sanctum with cookies (often needed)
      // await api.get('/sanctum/csrf-cookie');
      // But we are using token based auth likely based on axios.js looking for 'token' in localStorage

      const response = await api.post("/login", { email, password });

      // Assuming response contains token. If Laravel Sanctum stateful, it sets 'laravel_session' cookie.
      // But typically for API token auth, we get a token back.
      // Adjust based on typical Laravel API resource response.
      // Often keys are data.token or just token.

      const token = response.data.token;

      if (token) {
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
        localStorage.setItem("token", token);
      }

      router.push("/components/customer");
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ general: ["Invalid credentials!"] });
      }
      console.error("Login Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <svg
                  className="w-7 h-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M6 2L3 6V20c0 1.1.9 2 2 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ShopMart
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="/#categories"
                className="text-gray-700 hover:text-green-600 font-semibold transition-colors"
              >
                Categories
              </Link>
              <Link
                href="/#featured"
                className="text-gray-700 hover:text-green-600 font-semibold transition-colors"
              >
                Products
              </Link>
              <Link
                href="/components/about"
                className="text-gray-700 hover:text-green-600 font-semibold transition-colors"
              >
                About
              </Link>
            </div>

            {/* Right Side - Register Link */}
            <div className="flex items-center gap-4">
              <Link
                href="/register"
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-screen pt-20 pb-10 px-4">
        <div className="w-full max-w-md px-8 py-10 bg-white rounded-3xl shadow-2xl shadow-green-200/50 transition-all duration-300 hover:shadow-green-300/60 border border-green-100">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-lg">
              Sign in to continue to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors?.general && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm font-medium backdrop-blur-sm">
                {errors.general[0]}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-gray-300 ml-1"
              >
                Email Address
              </label>
              <div className="relative group">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full px-5 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 rounded-xl focus:ring-2 outline-none text-gray-900 placeholder-gray-500 transition-all duration-300 ${
                    errors?.email
                      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                      : "border-green-200 focus:ring-green-400 focus:border-green-400 hover:border-green-300"
                  }`}
                  placeholder="name@example.com"
                />
              </div>
              {errors?.email && (
                <p className="ml-1 text-sm text-red-400 font-medium">
                  {errors.email[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-gray-300 ml-1"
              >
                Password
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full px-5 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 rounded-xl focus:ring-2 outline-none text-gray-900 placeholder-gray-500 transition-all duration-300 ${
                    errors?.password
                      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                      : "border-green-200 focus:ring-green-400 focus:border-green-400 hover:border-green-300"
                  }`}
                  placeholder="Enter your password"
                />
              </div>
              {errors?.password && (
                <p className="ml-1 text-sm text-red-400 font-medium">
                  {errors.password[0]}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="w-4 h-4 rounded border-green-300 text-green-600 focus:ring-green-400 bg-green-50"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors"
                >
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a
                  href="#"
                  className="font-semibold text-green-600 hover:text-green-800 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl text-base font-bold text-white bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-500 hover:via-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-400/40"
            >
              {loading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-base">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                Sign up now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

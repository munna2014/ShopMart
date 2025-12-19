"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      console.log("Starting logout process...");
      await logout();
      console.log("Logout completed, redirecting to home...");
      router.push("/");
      // Force page refresh to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("Logout process error:", error);
      // Force logout even if there's an error
      localStorage.removeItem("token");
      window.location.href = "/";
    }
  };

  return (
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

          {/* Right Side - Auth Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {/* User Menu */}
                <div className="flex items-center gap-4">
                  <span className="text-gray-700 font-medium">
                    Welcome, {user?.full_name || user?.name}
                  </span>
                  
                  {/* Dashboard Links */}
                  {isAdmin() ? (
                    <Link
                      href="/components/admin"
                      className="px-4 py-2 text-green-600 hover:text-green-800 font-semibold transition-colors"
                    >
                      Admin Dashboard
                    </Link>
                  ) : (
                    <Link
                      href="/components/customer"
                      className="px-4 py-2 text-green-600 hover:text-green-800 font-semibold transition-colors"
                    >
                      My Account
                    </Link>
                  )}
                  
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Login/Register Links */}
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:text-green-600 font-semibold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
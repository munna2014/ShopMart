"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import {
  addGuestItem,
  getGuestCart,
  getGuestCartCount,
  updateGuestItem,
} from "@/lib/guestCart";

export default function HomeClient() {
  const router = useRouter();
  const { logout, isAuthenticated, user, loading } = useAuth();
  const [currentImageSet, setCurrentImageSet] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // State for real data
  const [stats, setStats] = useState({
    total_products: 0,
    total_customers: 0,
    total_orders: 0,
  });
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statsReady, setStatsReady] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Image sets for rotation
  const imageSets = [
    [
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop",
    ],
    [
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=400&fit=crop",
    ],
    [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop",
    ],
  ];

  // Fetch home page data
  const fetchHomeData = async () => {
    try {
      setDataLoading(true);
      
      // Fetch stats, categories, and featured products
      const [statsRes, categoriesRes, productsRes] = await Promise.all([
        api.get('/home/stats'),
        api.get('/home/categories'),
        api.get('/home/featured-products')
      ]);
      
      const nextStats = statsRes.data || { total_products: 0, total_customers: 0, total_orders: 0 };
      setStats(nextStats);
      setStatsReady(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("home_stats_cache", JSON.stringify(nextStats));
      }
      setCategories(categoriesRes.data.categories || []);
      setFeaturedProducts(productsRes.data.products || []);
    } catch (error) {
      console.error('Error fetching home data:', error);
      // Set fallback data on error
      setStats({ total_products: 0, total_customers: 0, total_orders: 0 });
      setStatsReady(true);
      setCategories([]);
      setFeaturedProducts([]);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const cachedStats = localStorage.getItem("home_stats_cache");
      if (cachedStats) {
        try {
          const parsed = JSON.parse(cachedStats);
          setStats(parsed);
          setStatsReady(true);
        } catch (error) {
          console.error("Failed to parse cached stats:", error);
        }
      }
    }
    fetchHomeData();
  }, []);

  // Rotate images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageSet((prev) => (prev + 1) % imageSets.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    try {
      console.log("Home page: Starting logout process...");
      await logout();
      console.log("Home page: Logout completed successfully");
      // No need to redirect since we're already on home page
      // The AuthContext will update isAuthenticated state automatically
    } catch (error) {
      console.error("Home page: Logout process error:", error);
      // Force logout even if there's an error
      localStorage.removeItem("token");
      // Force page refresh as fallback
      window.location.reload();
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    const target = trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products";
    router.push(target);
  };

  const fetchCart = async () => {
    try {
      const response = await api.get("/cart");
      const items = response.data.cart?.items || [];
      const mapped = items.map((item) => ({
        id: item.product_id,
        quantity: item.quantity,
      }));
      setCartItems(mapped);
    } catch (error) {
      console.error("Error fetching cart:", error);
      setCartItems([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCartItems(getGuestCart());
    }
  }, [isAuthenticated]);

  const handleAddToCart = async (product) => {
    if (product.inStock === false || (product.stock || 0) <= 0) {
      return;
    }

    setAddingToCart((prev) => ({ ...prev, [product.id]: true }));
    if (!isAuthenticated) {
      const updated = addGuestItem(product, 1);
      setCartItems(updated);
      setAddingToCart((prev) => ({ ...prev, [product.id]: false }));
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { id: product.id, quantity: 1 }];
    });
    try {
      await api.post("/cart/items", { product_id: product.id, quantity: 1 });
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert(error.response?.data?.message || "Failed to add item to cart.");
      fetchCart();
    } finally {
      setAddingToCart((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const updateCartQuantity = async (productId, nextQuantity) => {
    setCartItems((prev) => {
      if (nextQuantity <= 0) {
        return prev.filter((item) => item.id !== productId);
      }
      return prev.map((item) =>
        item.id === productId ? { ...item, quantity: nextQuantity } : item
      );
    });

    if (!isAuthenticated) {
      const updated = updateGuestItem(productId, nextQuantity);
      setCartItems(updated);
      return;
    }

    try {
      if (nextQuantity <= 0) {
        await api.delete(`/cart/items/${productId}`);
      } else {
        await api.patch(`/cart/items/${productId}`, {
          quantity: nextQuantity,
        });
      }
    } catch (error) {
      console.error("Error updating cart:", error);
      alert(error.response?.data?.message || "Failed to update cart.");
      fetchCart();
    }
  };

  const cartCount = isAuthenticated
    ? cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
    : getGuestCartCount();

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <svg
                  className="w-6 h-6 md:w-7 md:h-7 text-white"
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
              <span className="text-xl md:text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ShopMart
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
              <a
                href="#categories"
                className="text-gray-700 hover:text-green-600 font-semibold transition-colors"
              >
                Categories
              </a>
              <a
                href="#featured"
                className="text-gray-700 hover:text-green-600 font-semibold transition-colors"
              >
                Products
              </a>
              <a
                href="/components/about"
                className="text-gray-700 hover:text-green-600 font-semibold transition-colors"
              >
                About
              </a>
            </div>

            {/* Desktop Search */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden lg:flex items-center gap-2 w-56 xl:w-72"
            >
              <div className="flex-1 relative">
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 placeholder-gray-400"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors"
              >
                Search
              </button>
            </form>

            {/* Right Side - Auth Buttons */}
            <div className="flex items-center gap-4 ml-auto">
              {loading ? null : isAuthenticated ? (
                <>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen((prev) => !prev)}
                      className="p-2 text-green-600 hover:text-green-700 transition-colors"
                      aria-label="Open menu"
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                    >
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                        <Link
                          href="/components/customer?tab=profile"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Personal Info
                        </Link>
                        <Link
                          href="/components/customer?tab=orders"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Orders
                        </Link>
                        <Link
                          href="/components/customer?tab=shop"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Shop
                        </Link>
                        <Link
                          href="/components/customer?tab=addresses"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Addresses
                        </Link>
                        <Link
                          href="/components/customer?tab=settings"
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Settings
                        </Link>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleSignOut();
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:block px-6 py-2.5 text-green-600 font-semibold hover:text-green-700 transition-colors"
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

      {/* Hero Section */}
      <section className="relative pt-28 md:pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Clean Background with Rotating Images */}
        <div className="absolute inset-0 bg-white">
          {/* Background Images Layer */}
          <div className="absolute inset-0 opacity-60">
            {/* Shopping Image 1 - Top Left */}
            <div
              className="absolute top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 bg-cover bg-center rounded-full blur-sm animate-float-slow transition-all duration-1000 hidden sm:block"
              style={{
                backgroundImage: `url(${imageSets[currentImageSet][0]})`,
              }}
            ></div>

            {/* Shopping Image 2 - Top Right */}
            <div
              className="absolute top-20 right-10 w-60 h-60 sm:w-72 sm:h-72 lg:w-80 lg:h-80 bg-cover bg-center rounded-full blur-sm animate-float-slow animation-delay-2000 transition-all duration-1000 hidden sm:block"
              style={{
                backgroundImage: `url(${imageSets[currentImageSet][1]})`,
              }}
            ></div>

            {/* Shopping Image 3 - Bottom Left */}
            <div
              className="absolute bottom-10 left-10 w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 bg-cover bg-center rounded-full blur-sm animate-float-slow animation-delay-4000 transition-all duration-1000 hidden md:block"
              style={{
                backgroundImage: `url(${imageSets[currentImageSet][2]})`,
              }}
            ></div>

            {/* Shopping Image 4 - Bottom Right */}
            <div
              className="absolute bottom-20 right-20 w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 bg-cover bg-center rounded-full blur-sm animate-float-slow animation-delay-3000 transition-all duration-1000 hidden md:block"
              style={{
                backgroundImage: `url(${imageSets[currentImageSet][3]})`,
              }}
            ></div>

            {/* Shopping Image 5 - Center */}
            <div
              className="absolute top-1/3 left-1/3 w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 bg-cover bg-center rounded-full blur-sm animate-blob transition-all duration-1000 hidden sm:block"
              style={{
                backgroundImage: `url(${imageSets[currentImageSet][4]})`,
              }}
            ></div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-8">
              <svg
                className="w-5 h-5 text-yellow-500"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm font-semibold text-gray-700">
                Premium Quality Products
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Shop Smarter,
              <span className="block bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Live Better
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg lg:text-xl text-black mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover thousands of premium products from trusted brands. Fast
              shipping, secure payments, and unbeatable prices.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="#featured"
                className="group w-full sm:w-auto justify-center px-7 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2"
              >
                Shop Now
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

              <a
                href="#categories"
                className="w-full sm:w-auto text-center px-7 py-3.5 bg-white text-gray-700 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all border-2 border-gray-200"
              >
                Browse Categories
              </a>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dataLoading && !statsReady ? "..." : stats.total_products || "0"}
                </div>
                <div className="text-sm text-gray-600 mt-1">Products</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dataLoading && !statsReady ? "..." : stats.total_customers || "0"}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Happy Customers
                </div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Free
                </div>
                <div className="text-sm text-black  mt-1">Shipping</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-xl text-gray-600">
              Explore our wide range of product categories
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dataLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 animate-pulse"
                >
                  <div className="w-16 h-16 bg-gray-200 rounded-xl mb-6"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ))
            ) : categories.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-lg font-medium">No categories available</p>
                  <p className="text-sm">Categories will appear here once added</p>
                </div>
              </div>
            ) : (
              categories.map((category, index) => {
                const rawIcon = typeof category.icon === "string" ? category.icon.trim() : "";
                const rawColor = typeof category.color === "string" ? category.color.trim() : "";
                const iconIsInvalid =
                  rawIcon === "" ||
                  rawIcon === "null" ||
                  rawIcon === "undefined" ||
                  rawIcon.includes("<");
                const iconPath = iconIsInvalid
                  ? "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  : rawIcon;
                const allowedGradients = new Set([
                  "from-purple-500 to-purple-600",
                  "from-blue-500 to-blue-600",
                  "from-green-500 to-green-600",
                  "from-green-500 to-emerald-600",
                  "from-orange-500 to-orange-600",
                  "from-pink-500 to-rose-500",
                  "from-teal-500 to-emerald-500",
                ]);
                const colorClass = allowedGradients.has(rawColor)
                  ? rawColor
                  : "from-green-500 to-emerald-600";

                return (
                  <div
                    key={index}
                    className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border border-gray-100"
                  >
                    <div
                      className={`w-16 h-16 bg-gradient-to-br ${colorClass} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <svg
                        className="w-8 h-8 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d={iconPath}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {category.name}
                    </h3>
                    <p className="text-gray-600 font-medium">
                      {category.count || 0} items
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="featured" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Featured Products
            </h2>
            <p className="text-xl text-gray-600">
              Hand-picked products just for you
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {dataLoading ? (
              // Loading skeleton for products
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse"
                >
                  <div className="aspect-square bg-gray-200"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : featuredProducts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500">
                  <svg
                    className="w-10 h-10 mx-auto mb-4 text-gray-400"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-lg font-medium">No featured products available</p>
                  <p className="text-sm">Featured products will appear here once added</p>
                </div>
              </div>
            ) : (
              featuredProducts.map((product, index) => (
              (() => {
                const cartItem = cartItems.find((item) => item.id === product.id);
                const cartQuantity = cartItem?.quantity || 0;
                const availableStock = Math.max(
                  0,
                  (product.stock || 0) - cartQuantity
                );
                const atStockLimit = availableStock === 0 && cartQuantity > 0;

                return (
              <div
                key={index}
                className="group bg-gray rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                {product.badge && (
                  <div
                    className={`absolute top-4 left-4 ${
                      product.badgeColor || "bg-red-500"
                    } text-white px-3 py-1 rounded-full text-sm font-bold z-10`}
                  >
                    {product.badge}
                  </div>
                )}

                <Link
                  href={`/productDetails/${product.id}`}
                  className="relative aspect-square overflow-hidden block"
                >
                  <img
                    src={product.image || product.image_url || '/images/default-product.svg'}
                    alt={product.name}
                    className="w-90 h-100 object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = '/images/default-product.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </Link>

                <div className="p-6">
                  <div className="mb-2">
                    {product.category && (
                      <span className="text-xs text-green-600 font-medium uppercase tracking-wide">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/productDetails/${product.id}`}
                    className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 hover:text-green-700 transition-colors block"
                  >
                    {product.name}
                  </Link>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex text-yellow-400">
                      {"★".repeat(product.rating || 4)}
                      {"☆".repeat(5 - (product.rating || 4))}
                    </div>
                    <span className="text-sm text-gray-500">
                      ({product.reviews || '0'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl font-bold text-gray-900">
                      {product.price || `$${parseFloat(product.price || 0).toFixed(2)}`}
                    </span>
                    {product.oldPrice && (
                      <span className="text-lg text-gray-400 line-through">
                        {product.oldPrice}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">
                      {availableStock > 0
                        ? `${availableStock} in stock`
                        : 'Out of stock'}
                    </span>
                    {product.inStock === false && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {cartItem ? (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() =>
                          updateCartQuantity(product.id, cartQuantity - 1)
                        }
                        className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200"
                      >
                        -
                      </button>
                      <span className="font-semibold text-gray-900">
                        {cartQuantity}
                      </span>
                      <button
                        onClick={() =>
                          updateCartQuantity(product.id, cartQuantity + 1)
                        }
                        disabled={atStockLimit}
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          atStockLimit
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-500"
                        }`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className={`w-full py-3 rounded-xl font-semibold transition-all ${
                        product.inStock !== false && !addingToCart[product.id]
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:scale-105' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={product.inStock === false || addingToCart[product.id]}
                    >
                      {product.inStock !== false
                        ? addingToCart[product.id]
                          ? "Adding..."
                          : "Add to Cart"
                        : "Out of Stock"}
                    </button>
                  )}
                </div>
              </div>
                );
              })()
              ))
            )}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-600 border-2 border-green-600 rounded-full font-bold hover:bg-green-50 transition-all hover:scale-105"
            >
              View More Products
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full filter blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Join Our Shopping Community
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Sign up today and get exclusive access to deals, early product
            launches, and member-only benefits
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-4 bg-white text-green-600 rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all"
            >
              Create Free Account
            </Link>
            <Link
              href="#featured"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
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
                <span className="text-2xl font-bold">ShopMart</span>
              </div>
              <p className="text-gray-400">
                Your trusted destination for quality products at unbeatable
                prices.
              </p>
            </div>

            {[
              {
                title: "Shop",
                links: [
                  "All Categories",
                  "Featured Products",
                  "Special Deals",
                  "New Arrivals",
                ],
              },
              {
                title: "Support",
                links: [
                  "Help Center",
                  "Shipping Info",
                  "Returns",
                  "Contact Us",
                ],
              },
              {
                title: "Company",
                links: [
                  "About Us",
                  "Careers",
                  "Privacy Policy",
                  "Terms of Service",
                ],
              },
            ].map((column, index) => (
              <div key={index}>
                <h4 className="text-lg font-bold mb-4">{column.title}</h4>
                <ul className="space-y-2">
                  {column.links.map((link, i) => (
                    <li key={i}>
                      <a
                        href="#"
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400">
              &copy; 2024 ShopMart. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {[
                "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
                "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z",
              ].map((path, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes blob-reverse {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-30px, 50px) scale(0.9);
          }
          66% {
            transform: translate(20px, -20px) scale(1.1);
          }
        }

        .animate-blob-reverse {
          animation: blob-reverse 9s infinite;
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }

        /* Shopping Icon Animations */
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>

      {cartCount > 0 && (
        <Link
          href="/components/customer/cart"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Cart ({cartCount})
        </Link>
      )}
    </div>
  );
}

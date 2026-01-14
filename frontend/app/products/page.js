"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import { addGuestItem, getGuestCart, updateGuestItem } from "@/lib/guestCart";
import { getPricing } from "@/lib/pricing";
import DiscountCountdown from "@/components/DiscountCountdown";
import ProductImage from "@/components/ProductImage";

export default function ProductsPage() {
  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchSuggestionsLoading, setSearchSuggestionsLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) {
      setSearchTerm(query);
    }
  }, [searchParams]);

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

  // Fetch products and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check cache first
        const productsCache = localStorage.getItem("products_page_cache");
        const categoriesCache = localStorage.getItem("products_categories_cache");
        
        let shouldFetchProducts = true;
        let shouldFetchCategories = true;
        
        // Load products from cache
        if (productsCache) {
          try {
            const parsed = JSON.parse(productsCache);
            const cacheAge = Date.now() - new Date(parsed.cached_at).getTime();
            setProducts(parsed.data || []);
            setLoading(false);
            console.log("Products loaded from cache:", { count: parsed.data?.length, cacheAge: Math.round(cacheAge / 1000) + "s" });
            // Cache valid for 5 minutes
            if (cacheAge < 300000) {
              shouldFetchProducts = false;
            }
          } catch (e) {
            console.error("Failed to parse cached products:", e);
          }
        }
        
        // Load categories from cache
        if (categoriesCache) {
          try {
            const parsed = JSON.parse(categoriesCache);
            const cacheAge = Date.now() - new Date(parsed.cached_at).getTime();
            setCategories(parsed.data || []);
            console.log("Categories loaded from cache:", { count: parsed.data?.length, cacheAge: Math.round(cacheAge / 1000) + "s" });
            // Cache valid for 10 minutes
            if (cacheAge < 600000) {
              shouldFetchCategories = false;
            }
          } catch (e) {
            console.error("Failed to parse cached categories:", e);
          }
        }
        
        // If both are cached and fresh, skip API calls
        if (!shouldFetchProducts && !shouldFetchCategories) {
          return;
        }
        
        setLoading(true);
        
        // Fetch only what's needed
        const requests = [];
        if (shouldFetchProducts) requests.push(api.get('/home/featured-products?limit=100'));
        if (shouldFetchCategories) requests.push(api.get('/categories'));
        
        const responses = await Promise.all(requests);
        
        let productsRes = shouldFetchProducts ? responses[0] : null;
        let categoriesRes = shouldFetchCategories ? (shouldFetchProducts ? responses[1] : responses[0]) : null;
        
        // Update products if fetched
        if (productsRes) {
          const productsData = productsRes.data.products || [];
          setProducts(productsData);
          localStorage.setItem("products_page_cache", JSON.stringify({
            data: productsData,
            cached_at: new Date().toISOString()
          }));
          console.log("Products cached:", { count: productsData.length });
        }
        
        // Update categories if fetched
        if (categoriesRes) {
          const categoriesData = categoriesRes.data.categories || [];
          setCategories(categoriesData);
          localStorage.setItem("products_categories_cache", JSON.stringify({
            data: categoriesData,
            cached_at: new Date().toISOString()
          }));
          console.log("Categories cached:", { count: categoriesData.length });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by price range
    if (minPrice !== '') {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        filtered = filtered.filter(product => {
          const pricing = getPricing(product);
          return pricing.discountedPrice >= min;
        });
      }
    }

    if (maxPrice !== '') {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        filtered = filtered.filter(product => {
          const pricing = getPricing(product);
          return pricing.discountedPrice <= max;
        });
      }
    }

    // Sort products by name (A-Z)
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, minPrice, maxPrice]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, minPrice, maxPrice]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 1) {
      setSearchSuggestions([]);
      setSearchSuggestionsLoading(false);
      return;
    }

    let active = true;
    const timeout = setTimeout(async () => {
      try {
        setSearchSuggestionsLoading(true);
        const response = await api.get('/products/suggestions', {
          params: {
            q: trimmed,
            limit: 6,
          },
        });
        if (!active) return;
        setSearchSuggestions(response.data.suggestions || []);
      } catch (error) {
        if (active) {
          setSearchSuggestions([]);
        }
      } finally {
        if (active) {
          setSearchSuggestionsLoading(false);
        }
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchTerm]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredProducts, pageSize, currentPage]);

  const handleAddToCart = async (product) => {
    if (product.inStock === false || (product.stock || 0) <= 0) {
      return;
    }

    setAddingToCart((prev) => ({ ...prev, [product.id]: true }));
    try {
      if (!isAuthenticated) {
        const pricing = getPricing(product);
        const updated = addGuestItem(
          {
            id: product.id,
            name: product.name,
            price: pricing.discountedPrice,
            image: product.image || product.image_url,
          },
          1
        );
        setCartItems(updated);
      } else {
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
        await api.post("/cart/items", { product_id: product.id, quantity: 1 });
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert(error.response?.data?.message || "Failed to add item to cart.");
      if (isAuthenticated) {
        fetchCart();
      }
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

  const cartCount = cartItems.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pageStart = filteredProducts.length === 0
    ? 0
    : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(filteredProducts.length, currentPage * pageSize);
  const paginatedProducts = filteredProducts.slice(pageStart - 1, pageEnd);
  const pageWindow = 2;
  const startPage = Math.max(1, currentPage - pageWindow);
  const endPage = Math.min(totalPages, currentPage + pageWindow);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );
  const trimmedSearch = searchTerm.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
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
              <span className="text-xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ShopMart
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Home
              </Link>
              <Link href="/products" className="text-green-600 font-semibold">
                Products
              </Link>
              {isAuthenticated && (
                <Link href="/components/customer" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                  Profile
                </Link>
              )}
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <span className="text-gray-700">Welcome, {user?.full_name}</span>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-green-600 font-semibold hover:text-green-700 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-sm sm:text-base text-gray-600">Discover our complete collection of quality products</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  placeholder="Search by name, description, or category..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none text-sm"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                {showSuggestions && trimmedSearch.length >= 1 && (
                  <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden divide-y divide-gray-200">
                    {searchSuggestionsLoading ? (
                      <div className="px-4 py-2.5 text-xs text-gray-500">
                        Searching...
                      </div>
                    ) : searchSuggestions.length > 0 ? (
                      searchSuggestions.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setSearchTerm(product.name);
                            setShowSuggestions(false);
                          }}
                          className="w-full flex items-center gap-3 text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                        >
                          <ProductImage
                            src={product.image_url || product.image}
                            alt={product.name}
                            className="w-8 h-8 rounded-md object-cover border border-gray-200 bg-gray-100"
                          />
                          <span className="font-semibold text-gray-900">
                            {product.name}
                          </span>
                          <span className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors">
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M7 17L17 7M7 7h10v10" />
                            </svg>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2.5 text-xs text-gray-500">
                        No products found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  min="0"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none text-sm"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  min="0"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs sm:text-sm text-gray-600">
              Showing {pageStart} to {pageEnd} of {filteredProducts.length} products
              {searchTerm && ` for "${searchTerm}"`}
              {selectedCategory && ` in "${selectedCategory}"`}
              {(minPrice || maxPrice) && ` | Price: ${minPrice || '0'} - ${maxPrice || '∞'}`}
            </p>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border animate-pulse">
                <div className="aspect-[4/3] bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
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
              <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory
                  ? "Try adjusting your search or filter criteria"
                  : "No products are available at the moment"}
              </p>
              {(searchTerm || selectedCategory || minPrice || maxPrice) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                    setMinPrice('');
                    setMaxPrice('');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {paginatedProducts.map((product) => {
              const cartItem = cartItems.find((item) => item.id === product.id);
              const cartQuantity = cartItem?.quantity || 0;
              const availableStock = Math.max(
                0,
                (product.stock || 0) - cartQuantity
              );
              const atStockLimit = availableStock === 0 && cartQuantity > 0;
              const pricing = getPricing(product);
              const showDiscount =
                pricing.discountActive &&
                pricing.basePrice > pricing.discountedPrice;
              const ratingValue = Math.max(
                0,
                Math.min(5, Math.round(Number(product.rating || 0)))
              );
              const reviewCount = Number(product.reviews || 0);

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                >
                {product.badge && (
                  <div
                    className={`absolute top-3 left-3 ${
                      product.badgeColor || "bg-red-500"
                    } text-white px-2 py-1 rounded-full text-xs font-bold z-10`}
                  >
                    {product.badge}
                  </div>
                )}

                <Link
                  href={`/customer_product_details/${product.id}`}
                  className="relative aspect-[4/3] overflow-hidden rounded-t-lg block flex-shrink-0"
                >
                  <ProductImage
                    src={product.image_url || product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                <div className="p-4 flex flex-col flex-grow">
                  {product.category && (
                    <span className="text-xs text-green-600 font-medium uppercase tracking-wide">
                      {product.category}
                    </span>
                  )}
                  
                  <Link
                    href={`/customer_product_details/${product.id}`}
                    className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 hover:text-green-700 transition-colors block"
                  >
                    {product.name}
                  </Link>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[40px]">
                    {product.description || "No description available"}
                  </p>

                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-yellow-400">
                      {"\u2605".repeat(ratingValue)}
                      {"\u2606".repeat(5 - ratingValue)}
                    </div>
                    <span className="text-sm text-gray-500 ml-1">
                      ({reviewCount})
                    </span>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl font-bold text-gray-900">
                        ${pricing.discountedPrice.toFixed(2)}
                      </span>
                      {showDiscount ? (
                        <span className="text-xs text-gray-500 line-through">
                          ${pricing.basePrice.toFixed(2)}
                        </span>
                      ) : null}
                      {showDiscount ? (
                        <span className="text-xs font-semibold text-rose-600">
                          -{pricing.discountPercent}%
                        </span>
                      ) : null}
                    </div>
                    <div className="h-8 mb-2">
                      {showDiscount && product.discount_ends_at ? (
                        <DiscountCountdown endDate={product.discount_ends_at} />
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </span>
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
                        className={`w-full py-2 rounded-lg font-medium transition-all ${
                          product.inStock !== false && !addingToCart[product.id]
                            ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={product.inStock === false || addingToCart[product.id]}
                      >
                        {product.inStock !== false
                          ? addingToCart[product.id]
                            ? 'Adding...'
                            : 'Add to Cart'
                          : 'Out of Stock'}
                      </button>
                    )}
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredProducts.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                Per page
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  {[8, 12, 16, 24].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      page === currentPage
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-300 text-gray-700"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
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
            <span className="text-xl font-bold">ShopMart</span>
          </div>
          <p className="text-gray-400 mb-4">
            Your trusted destination for quality products at unbeatable prices.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/products" className="text-gray-400 hover:text-white transition-colors">
              Products
            </Link>
            <Link href="/components/about" className="text-gray-400 hover:text-white transition-colors">
              About
            </Link>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-gray-400">
              &copy; 2024 ShopMart. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

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





"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import { clearGuestCart, getGuestCart, updateGuestItem } from "@/lib/guestCart";
import { getPricing } from "@/lib/pricing";

export default function CartPage() {
  const router = useRouter();
  const { loading, isAuthenticated, isAdmin } = useAuth();

  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (isAdmin()) {
      router.replace("/components/admin");
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  const fetchCart = async () => {
    try {
      setCartLoading(true);
      if (isAuthenticated) {
        const response = await api.get("/cart");
        const items = response.data.cart?.items || [];
        const mapped = items.map((item) => ({
          id: item.product_id,
          name: item.product?.name,
          ...(() => {
            const pricing = getPricing(item.product || { price: item.unit_price });
            return {
              price: pricing.discountedPrice,
              originalPrice: pricing.basePrice,
              discountPercent: pricing.discountPercent,
              discountActive: pricing.discountActive,
            };
          })(),
          image: item.product?.image_url || "/images/default-product.svg",
          quantity: item.quantity,
          stock:
            typeof item.product?.stock === "number"
              ? item.product.stock
              : typeof item.stock === "number"
              ? item.stock
              : null,
        }));
        setCart(mapped);
      } else {
        const guestItems = getGuestCart();
        const enriched = await Promise.all(
          guestItems.map(async (item) => {
            try {
              const response = await api.get(`/products/${item.id}`);
              const product = response.data.data;
              const pricing = getPricing(product);
              return {
                id: item.id,
                name: product?.name || item.name,
                price: pricing.discountedPrice,
                originalPrice: pricing.basePrice,
                discountPercent: pricing.discountPercent,
                discountActive: pricing.discountActive,
                image: product?.image_url || item.image || "/images/default-product.svg",
                quantity: item.quantity,
                stock: product?.stock_quantity ?? null,
              };
            } catch (error) {
              return {
                id: item.id,
                name: item.name,
                price: Number(item.price || 0),
                image: item.image || "/images/default-product.svg",
                quantity: item.quantity,
                stock: null,
              };
            }
          })
        );
        setCart(enriched);
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
      setCart([]);
    } finally {
      setCartLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [isAuthenticated]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const price = Number(item.price || 0);
      return sum + price * (item.quantity || 0);
    }, 0);
    return {
      subtotal,
      total: subtotal,
    };
  }, [cart]);

  const updateQuantity = async (productId, nextQuantity) => {
    setCart((prev) => {
      if (nextQuantity <= 0) {
        return prev.filter((item) => item.id !== productId);
      }
      return prev.map((item) =>
        item.id === productId ? { ...item, quantity: nextQuantity } : item
      );
    });

    if (!isAuthenticated) {
      const updated = updateGuestItem(productId, nextQuantity);
      setCart((prev) =>
        prev
          .map((item) =>
            item.id === productId ? { ...item, quantity: nextQuantity } : item
          )
          .filter((item) => item.quantity > 0)
      );
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
      console.error("Failed to update cart:", error);
      alert(error.response?.data?.message || "Failed to update cart.");
      fetchCart();
    }
  };

  const handleClearCart = async () => {
    if (!confirm("Clear all items from your cart?")) {
      return;
    }

    if (!isAuthenticated) {
      clearGuestCart();
      setCart([]);
      return;
    }

    try {
      await api.delete("/cart");
      setCart([]);
    } catch (error) {
      console.error("Failed to clear cart:", error);
      alert(error.response?.data?.message || "Failed to clear cart.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link href="/components/customer" className="flex items-center gap-3 group">
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
              <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ShopMart
              </span>
            </Link>
            <Link
              href="/components/customer"
              className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
            >
              Back to Shop
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

          {cartLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Your cart is empty.</p>
              <Link
                href="/components/customer"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cart.map((item) => {
                  const stockLimit = typeof item.stock === "number" ? item.stock : null;
                  const isAtStockLimit =
                    stockLimit !== null && item.quantity >= stockLimit;

                  return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-200 rounded-xl"
                  >
                    <Link
                      href={`/customer_product_details/${item.id}`}
                      className="flex items-center gap-4 group"
                    >
                      <img
                        src={item.image || "/images/default-product.svg"}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-100 group-hover:border-green-200 transition-colors"
                      />
                      <div>
                        <div className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {"$" + Number(item.price || 0).toFixed(2)} x {item.quantity}
                          {item.discountActive && item.originalPrice > item.price ? (
                            <span className="ml-2 text-xs text-gray-400 line-through">
                              ${Number(item.originalPrice || 0).toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="font-semibold text-gray-900 w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isAtStockLimit}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isAtStockLimit
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-green-600 text-white hover:bg-green-500"
                          }`}
                        >
                          +
                        </button>
                      </div>
                      <div className="text-lg font-bold text-gray-900 w-24 text-right">
                        ${(Number(item.price || 0) * (item.quantity || 0)).toFixed(2)}
                      </div>
                      <button
                        onClick={() => updateQuantity(item.id, 0)}
                        className="text-red-400 hover:text-red-500"
                        aria-label={`Remove ${item.name}`}
                      >
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${totals.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/components/customer?tab=shop"
                    className="flex-1 text-center py-3 border border-green-200 text-green-700 rounded-xl font-semibold hover:bg-green-50 transition-all"
                  >
                    Continue Shopping
                  </Link>
                  <button
                    onClick={handleClearCart}
                    className="flex-1 text-center py-3 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all"
                  >
                    Clear Cart
                  </button>
                  <Link
                    href={
                      isAuthenticated
                        ? "/components/customer/checkout"
                        : "/login?redirect=/components/customer/checkout"
                    }
                    className="flex-1 text-center py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Proceed to Checkout
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

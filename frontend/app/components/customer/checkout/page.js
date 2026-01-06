"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import { getGuestCart, mergeGuestCartToServer } from "@/lib/guestCart";
import { getPricing } from "@/lib/pricing";

export default function CheckoutPage() {
  const router = useRouter();
  const { loading, isAuthenticated, isAdmin } = useAuth();

  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login?redirect=/components/customer/checkout");
    } else if (isAdmin()) {
      router.replace("/components/admin");
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  // Load cart from database
  useEffect(() => {
    const fetchCart = async () => {
      try {
        setCartLoading(true);
        if (getGuestCart().length > 0) {
          await mergeGuestCartToServer(api);
        }
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
        }));
        setCart(mapped);
      } catch (error) {
        console.error("Failed to load cart:", error);
        setCart([]);
      } finally {
        setCartLoading(false);
      }
    };
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated]);

  // Fetch addresses for selection
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchAddresses = async () => {
      try {
        setAddressesLoading(true);
        const response = await api.get("/addresses");
        const list = response.data.data || [];
        setAddresses(list);
        const preferred = list.find((a) => a.is_default) || list[0];
        setSelectedAddressId(preferred ? preferred.id : null);
      } catch (error) {
        console.error("Failed to load addresses:", error);
        setAddresses([]);
      } finally {
        setAddressesLoading(false);
      }
    };
    fetchAddresses();
  }, [isAuthenticated]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const price = Number(item.price || 0);
      return sum + price * (item.quantity || 0);
    }, 0);
    return {
      subtotal,
      shipping: 0,
      total: subtotal,
    };
  }, [cart]);

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/components/customer/checkout");
      return;
    }

    if (!selectedAddressId) {
      alert("Please select an address before placing the order.");
      return;
    }

    setPlacingOrder(true);
    try {
      await api.post("/orders", { address_id: selectedAddressId });
      setCart([]);
      alert("Order placed successfully!");
      router.push("/components/customer");
    } catch (error) {
      console.error("Failed to place order:", error);
      alert(error.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!isAuthenticated && !loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-gray-500">Step 2 of 2</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Checkout</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Secure Checkout
          </div>
        </div>

        {cartLoading ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
              Loading your cart...
            </div>
          </div>
        ) : cart.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-4">
              Add items to your cart to see them here.
            </p>
            <Link
              href="/components/customer"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Items</h2>
                  <span className="text-sm text-gray-500">{cart.length} products</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {cart.map((item) => (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={item.image || "/images/default-product.svg"}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">
                            {item.quantity} x {"$" + Number(item.price || 0).toFixed(2)}
                            {item.discountActive && item.originalPrice > item.price ? (
                              <span className="ml-2 text-xs text-gray-400 line-through">
                                ${Number(item.originalPrice || 0).toFixed(2)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          ${(Number(item.price || 0) * (item.quantity || 0)).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">In stock</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Delivery Address</h2>
                  <Link
                    href="/components/customer"
                    className="text-sm text-green-600 font-semibold hover:text-green-700"
                  >
                    Manage addresses
                  </Link>
                </div>

                {addressesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-600 mb-3">No saved addresses yet.</p>
                    <Link
                      href="/components/customer"
                      className="inline-flex items-center justify-center px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Add Address
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedAddressId === address.id
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-green-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={selectedAddressId === address.id}
                          onChange={() => setSelectedAddressId(address.id)}
                          className="mt-1 text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{address.full_name}</h3>
                            {address.is_default && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-semibold">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm">
                            {address.address_line_1}
                            {address.address_line_2 ? `, ${address.address_line_2}` : ""}, {address.city},{" "}
                            {address.state_province} {address.postal_code}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">{address.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-green-600">${totals.total.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={!selectedAddressId || placingOrder}
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {placingOrder ? "Placing Order..." : "Order"}
                </button>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  By placing this order you agree to our Terms and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}



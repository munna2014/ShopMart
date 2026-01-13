"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import { getGuestCart, mergeGuestCartToServer } from "@/lib/guestCart";
import { getPricing } from "@/lib/pricing";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const orderIdParam = searchParams.get("order_id");
  const isOrderView = Boolean(orderIdParam);

  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [orderPaymentLoading, setOrderPaymentLoading] = useState(false);
  const stripeRef = useRef(null);
  const cardElementRef = useRef(null);
  const cardMountRef = useRef(null);
  const stripeInitRef = useRef(false);

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
    if (isAuthenticated && !isOrderView) {
      fetchCart();
    }
  }, [isAuthenticated, isOrderView]);

  // Fetch addresses for selection
  useEffect(() => {
    if (!isAuthenticated || isOrderView) return;
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
  }, [isAuthenticated, isOrderView]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!isAuthenticated || !isOrderView || !orderIdParam) return;
      try {
        setOrderLoading(true);
        setOrderError("");
        const response = await api.get(`/orders/${orderIdParam}`);
        setOrderDetails(response.data.order || null);
      } catch (error) {
        console.error("Failed to load order:", error);
        setOrderDetails(null);
        setOrderError(error.response?.data?.message || "Failed to load order.");
      } finally {
        setOrderLoading(false);
      }
    };
    fetchOrderDetails();
  }, [isAuthenticated, isOrderView, orderIdParam]);

  const totals = useMemo(() => {
    if (isOrderView && orderDetails) {
      const total = Number(orderDetails.total_amount || 0);
      return {
        subtotal: total,
        shipping: 0,
        total,
      };
    }
    const subtotal = cart.reduce((sum, item) => {
      const price = Number(item.price || 0);
      return sum + price * (item.quantity || 0);
    }, 0);
    return {
      subtotal,
      shipping: 0,
      total: subtotal,
    };
  }, [cart, isOrderView, orderDetails]);

  const loadStripeScript = (publishableKey) =>
    new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Stripe is not available."));
        return;
      }
      if (window.Stripe) {
        resolve(window.Stripe(publishableKey));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
      script.onload = () => {
        if (!window.Stripe) {
          reject(new Error("Stripe.js failed to load."));
          return;
        }
        resolve(window.Stripe(publishableKey));
      };
      script.onerror = () => reject(new Error("Stripe.js failed to load."));
      document.body.appendChild(script);
    });

  const initializeStripe = async () => {
    if (stripeInitRef.current || stripeLoading) {
      return;
    }
    stripeInitRef.current = true;
    setStripeLoading(true);
    setStripeError("");
    try {
      const configResponse = await api.get("/payments/stripe/config");
      const publishableKey = configResponse.data.publishable_key;
      if (!publishableKey) {
        throw new Error("Stripe publishable key is not configured.");
      }
      const stripe = await loadStripeScript(publishableKey);
      if (!cardMountRef.current) {
        throw new Error("Payment form is not ready.");
      }
      const elements = stripe.elements();
      cardMountRef.current.innerHTML = "";
      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "14px",
            color: "#1f2937",
            "::placeholder": { color: "#9ca3af" },
          },
          invalid: { color: "#ef4444" },
        },
      });
      card.mount(cardMountRef.current);
      card.on("change", (event) => {
        setStripeError(event.error ? event.error.message : "");
      });
      stripeRef.current = stripe;
      cardElementRef.current = card;
      setStripeReady(true);
    } catch (error) {
      console.error("Failed to initialize Stripe:", error);
      setStripeError(error.message || "Failed to load Stripe.");
      stripeInitRef.current = false;
    } finally {
      setStripeLoading(false);
    }
  };

  const resetStripe = () => {
    if (cardElementRef.current) {
      cardElementRef.current.unmount();
      cardElementRef.current.destroy();
      cardElementRef.current = null;
    }
    stripeRef.current = null;
    stripeInitRef.current = false;
    setStripeReady(false);
    setStripeError("");
  };

  const isStripePayment = paymentMethod === "STRIPE";
  const canPlaceOrder =
    Boolean(selectedAddressId) &&
    !placingOrder &&
    (!isStripePayment || stripeReady);
  const isLoading = isOrderView ? orderLoading : cartLoading;
  const displayItems = isOrderView ? orderDetails?.items || [] : cart;
  const hasItems = displayItems.length > 0;
  const canPayOrder =
    isOrderView &&
    orderDetails?.payment_method === "STRIPE" &&
    ["PENDING", "UNPAID", "FAILED"].includes(orderDetails?.payment_status) &&
    orderDetails?.status !== "CANCELLED";
  const showOrderPaymentForm = Boolean(canPayOrder);

  useEffect(() => {
    if (isOrderView) {
      if (showOrderPaymentForm) {
        initializeStripe();
      } else {
        resetStripe();
      }
      return;
    }
    if (paymentMethod === "STRIPE") {
      initializeStripe();
      return;
    }
    resetStripe();
  }, [paymentMethod, isOrderView, showOrderPaymentForm]);

  const handlePlaceOrder = async () => {
    if (isOrderView) {
      return;
    }
    if (!isAuthenticated) {
      router.push("/login?redirect=/components/customer/checkout");
      return;
    }

    if (!selectedAddressId) {
      alert("Please select an address before placing the order.");
      return;
    }

    if (isStripePayment && !stripeReady) {
      setStripeError("Payment form is still loading. Please wait a moment.");
      return;
    }

    setPlacingOrder(true);
    setStripeError("");
    try {
      const response = await api.post("/orders", {
        address_id: selectedAddressId,
        payment_method: paymentMethod,
      });
      const order = response.data.order;

      if (!isStripePayment) {
        setCart([]);
        alert("Order placed successfully!");
        router.push("/components/customer");
        return;
      }

      const payment = response.data.payment || {};
      if (!payment.client_secret || !stripeRef.current || !cardElementRef.current) {
        throw new Error("Payment could not be initialized.");
      }

      const stripe = stripeRef.current;
      const result = await stripe.confirmCardPayment(payment.client_secret, {
        payment_method: { card: cardElementRef.current },
      });

      if (result.error) {
        setStripeError(result.error.message || "Payment failed. Please try again.");
        return;
      }

      if (result.paymentIntent?.status !== "succeeded") {
        setStripeError("Payment was not completed. Please try again.");
        return;
      }

      await api.post(`/orders/${order.id}/stripe-confirm`, {
        payment_intent_id: result.paymentIntent.id,
      });

      setCart([]);
      alert("Payment successful! Order placed.");
      router.push("/components/customer");
    } catch (error) {
      console.error("Failed to place order:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to place order. Please try again.";
      alert(message);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!isAuthenticated && !loading) {
    return null;
  }

  const orderStatusLabel = orderDetails?.status || "PENDING";
  const paymentMethodLabel =
    orderDetails?.payment_method === "STRIPE"
      ? "Pay Online (Stripe)"
      : "Cash on Delivery";
  const paymentStatusLabel = orderDetails?.payment_status || "UNPAID";
  const paidAtLabel = orderDetails?.paid_at
    ? new Date(orderDetails.paid_at).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "Not paid";

  const handlePayOrder = async () => {
    if (!orderDetails || !showOrderPaymentForm) {
      return;
    }
    if (!stripeReady) {
      setStripeError("Payment form is still loading. Please wait a moment.");
      return;
    }
    setOrderPaymentLoading(true);
    setStripeError("");
    try {
      const response = await api.post(`/orders/${orderDetails.id}/stripe-pay`);
      const payment = response.data.payment || {};
      if (!payment.client_secret || !stripeRef.current || !cardElementRef.current) {
        throw new Error("Payment could not be initialized.");
      }
      const stripe = stripeRef.current;
      const result = await stripe.confirmCardPayment(payment.client_secret, {
        payment_method: { card: cardElementRef.current },
      });

      if (result.error) {
        setStripeError(result.error.message || "Payment failed. Please try again.");
        return;
      }

      if (result.paymentIntent?.status !== "succeeded") {
        setStripeError("Payment was not completed. Please try again.");
        return;
      }

      await api.post(`/orders/${orderDetails.id}/stripe-confirm`, {
        payment_intent_id: result.paymentIntent.id,
      });

      const refreshed = await api.get(`/orders/${orderDetails.id}`);
      setOrderDetails(refreshed.data.order || null);
    } catch (error) {
      console.error("Failed to complete payment:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to complete payment. Please try again.";
      setStripeError(message);
    } finally {
      setOrderPaymentLoading(false);
    }
  };

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
            {isOrderView ? (
              <>
                <p className="text-sm text-gray-500">Order details</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {orderDetails
                    ? `Order #ORD-${String(orderDetails.id).padStart(5, "0")}`
                    : "Order Details"}
                </h1>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">Step 2 of 2</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Checkout</h1>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {isOrderView ? "Order Status" : "Secure Checkout"}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
              {isOrderView ? "Loading your order..." : "Loading your cart..."}
            </div>
          </div>
        ) : isOrderView && orderError ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order not available</h2>
            <p className="text-gray-600 mb-4">{orderError}</p>
            <button
              onClick={() => router.push("/components/customer?tab=orders")}
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Back to Orders
            </button>
          </div>
        ) : !hasItems ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isOrderView ? "No items found for this order" : "Your cart is empty"}
            </h2>
            <p className="text-gray-600 mb-4">
              {isOrderView
                ? "Please check your order history."
                : "Add items to your cart to see them here."}
            </p>
            {isOrderView ? (
              <button
                onClick={() => router.push("/components/customer?tab=orders")}
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Back to Orders
              </button>
            ) : (
              <Link
                href="/components/customer"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Continue Shopping
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Items</h2>
                  <span className="text-sm text-gray-500">{displayItems.length} products</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {displayItems.map((item) => {
                    const itemName = isOrderView
                      ? item.product?.name || "Item"
                      : item.name;
                    const unitPrice = isOrderView
                      ? Number(item.unit_price || item.product?.price || 0)
                      : Number(item.price || 0);
                    const itemImage = isOrderView
                      ? item.product?.image_url || "/images/default-product.svg"
                      : item.image || "/images/default-product.svg";
                    const itemQuantity = item.quantity || 0;

                    return (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={itemImage}
                          alt={itemName}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{itemName}</div>
                          <div className="text-sm text-gray-500">
                            {itemQuantity} x {"$" + unitPrice.toFixed(2)}
                            {!isOrderView && item.discountActive && item.originalPrice > item.price ? (
                              <span className="ml-2 text-xs text-gray-400 line-through">
                                ${Number(item.originalPrice || 0).toFixed(2)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          ${(unitPrice * itemQuantity).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {isOrderView ? "Order item" : "In stock"}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Delivery Address</h2>
                  {!isOrderView && (
                    <Link
                      href="/components/customer"
                      className="text-sm text-green-600 font-semibold hover:text-green-700"
                    >
                      Manage addresses
                    </Link>
                  )}
                </div>

                {isOrderView ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="font-semibold text-gray-900">
                      {orderDetails?.shipping_address?.full_name || "Customer"}
                    </div>
                    <p className="text-gray-600 text-sm">
                      {orderDetails?.shipping_address?.address_line_1 || "Address not available"}
                      {orderDetails?.shipping_address?.address_line_2
                        ? `, ${orderDetails.shipping_address.address_line_2}`
                        : ""}
                      {orderDetails?.shipping_address?.city
                        ? `, ${orderDetails.shipping_address.city}`
                        : ""}
                      {orderDetails?.shipping_address?.state_province
                        ? `, ${orderDetails.shipping_address.state_province}`
                        : ""}
                      {orderDetails?.shipping_address?.postal_code
                        ? ` ${orderDetails.shipping_address.postal_code}`
                        : ""}
                    </p>
                    {orderDetails?.shipping_address?.phone && (
                      <p className="text-gray-500 text-xs mt-2">
                        {orderDetails.shipping_address.phone}
                      </p>
                    )}
                  </div>
                ) : addressesLoading ? (
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {isOrderView ? "Order Status" : "Payment Method"}
                </h2>
                {isOrderView ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs uppercase text-gray-500">Order Status</div>
                      <div className="font-semibold text-gray-900">{orderStatusLabel}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs uppercase text-gray-500">Payment Method</div>
                      <div className="font-semibold text-gray-900">{paymentMethodLabel}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs uppercase text-gray-500">Payment Status</div>
                      <div className="font-semibold text-gray-900">{paymentStatusLabel}</div>
                      <div className="text-xs text-gray-500 mt-1">Paid at: {paidAtLabel}</div>
                    </div>
                    {showOrderPaymentForm && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs uppercase text-gray-500">Card Details</div>
                        <div
                          ref={cardMountRef}
                          className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 min-h-[44px] cursor-text"
                        ></div>
                        {stripeLoading && (
                          <div className="text-xs text-gray-500 mt-2">Loading payment form...</div>
                        )}
                        {stripeError && (
                          <div className="text-xs text-rose-600 mt-2">{stripeError}</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <label
                        className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          paymentMethod === "COD"
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-green-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value="COD"
                          checked={paymentMethod === "COD"}
                          onChange={() => {
                            setPaymentMethod("COD");
                            setStripeError("");
                          }}
                          className="mt-1 text-green-600 focus:ring-green-500"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">Cash on Delivery</div>
                          <div className="text-xs text-gray-500">Pay when your order arrives.</div>
                        </div>
                      </label>
                      <label
                        className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          paymentMethod === "STRIPE"
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-green-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value="STRIPE"
                          checked={paymentMethod === "STRIPE"}
                          onChange={() => {
                            setPaymentMethod("STRIPE");
                            setStripeError("");
                          }}
                          className="mt-1 text-green-600 focus:ring-green-500"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">Pay Online (Stripe)</div>
                          <div className="text-xs text-gray-500">Secure card payment.</div>
                        </div>
                      </label>
                    </div>
                    {paymentMethod === "STRIPE" && (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Card Details</div>
                        <div
                          ref={cardMountRef}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 min-h-[44px] cursor-text"
                        ></div>
                        {stripeLoading && (
                          <div className="text-xs text-gray-500 mt-2">Loading payment form...</div>
                        )}
                        {stripeError && (
                          <div className="text-xs text-rose-600 mt-2">{stripeError}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
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
                {isOrderView ? (
                  showOrderPaymentForm ? (
                    <button
                      onClick={handlePayOrder}
                      disabled={orderPaymentLoading || stripeLoading || !stripeReady}
                      className="w-full mt-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {orderPaymentLoading
                        ? "Processing Payment..."
                        : stripeLoading || !stripeReady
                        ? "Loading Payment..."
                        : "Pay Now"}
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push("/components/customer?tab=orders")}
                      className="w-full mt-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Back to Orders
                    </button>
                  )
                ) : (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={!canPlaceOrder}
                    className="w-full mt-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {placingOrder
                      ? isStripePayment
                        ? "Processing Payment..."
                        : "Placing Order..."
                      : isStripePayment
                      ? "Pay Now"
                      : "Place Order"}
                  </button>
                )}
                <p className="text-xs text-gray-500 mt-3 text-center">
                  {isOrderView
                    ? "Contact support if you need to update this order."
                    : "By placing this order you agree to our Terms and Privacy Policy."}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}



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
  const [loyaltyPoints, setLoyaltyPoints] = useState({
    available: 0,
    toUse: 0,
    discount: 0,
    canRedeem: false,
  });
  const [showLoyaltySection, setShowLoyaltySection] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponsError, setCouponsError] = useState("");
  const [couponsSubtotal, setCouponsSubtotal] = useState(0);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [orderPaymentLoading, setOrderPaymentLoading] = useState(false);
  const stripeRef = useRef(null);
  const cardElementRef = useRef(null);
  const cardMountRef = useRef(null);
  const stripeInitRef = useRef(false);
  const cartSignature = useMemo(
    () => cart.map((item) => `${item.id}:${item.quantity}`).join("|"),
    [cart]
  );

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

  // Fetch loyalty balance
  useEffect(() => {
    const fetchLoyaltyBalance = async () => {
      if (!isAuthenticated || isOrderView) return;
      try {
        const response = await api.get('/loyalty/balance');
        const data = response.data.data;
        setLoyaltyPoints({
          available: data.points || 0,
          toUse: 0,
          discount: 0,
          canRedeem: data.can_redeem || false,
        });
        setShowLoyaltySection(data.points >= 100);
      } catch (error) {
        console.error('Error fetching loyalty balance:', error);
      }
    };

    fetchLoyaltyBalance();
  }, [isAuthenticated, isOrderView]);

  useEffect(() => {
    if (!isAuthenticated || isOrderView) return;
    const fetchCoupons = async () => {
      try {
        setCouponsLoading(true);
        setCouponsError("");
        const response = await api.get("/coupons/active");
        setCoupons(response.data.coupons || []);
        setCouponsSubtotal(Number(response.data.cart_subtotal || 0));
      } catch (error) {
        console.error("Failed to load coupons:", error);
        setCoupons([]);
        setCouponsError(
          error.response?.data?.message || "Failed to load coupons."
        );
      } finally {
        setCouponsLoading(false);
      }
    };

    fetchCoupons();
  }, [isAuthenticated, isOrderView, cartSignature]);

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
        couponDiscount: 0,
        loyaltyDiscount: 0,
        shipping: 0,
        total,
      };
    }
    const subtotal = cart.reduce((sum, item) => {
      const price = Number(item.price || 0);
      return sum + price * (item.quantity || 0);
    }, 0);
    const couponDiscount = couponInfo?.discount_amount || 0;
    const loyaltyDiscount = loyaltyPoints.discount || 0;
    const finalTotal = Math.max(0, subtotal - couponDiscount - loyaltyDiscount);
    return {
      subtotal,
      couponDiscount,
      loyaltyDiscount,
      shipping: 0,
      total: finalTotal,
    };
  }, [cart, isOrderView, orderDetails, loyaltyPoints.discount, couponInfo]);

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
  const isLoading = loading || (isOrderView ? orderLoading : cartLoading);
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

  const handleLoyaltyPointsChange = async (points) => {
    if (points < 0 || points > loyaltyPoints.available) return;
    if (points > 0 && points % 100 !== 0) {
      alert('Points must be in multiples of 100');
      return;
    }

    try {
      if (points === 0) {
        setLoyaltyPoints(prev => ({ ...prev, toUse: 0, discount: 0 }));
        return;
      }

      const response = await api.post('/loyalty/calculate-redemption', { points });
      const data = response.data.data;
      
      setLoyaltyPoints(prev => ({
        ...prev,
        toUse: points,
        discount: data.discount_amount,
      }));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to calculate discount');
      setLoyaltyPoints(prev => ({ ...prev, toUse: 0, discount: 0 }));
    }
  };

  const handleApplyCoupon = async (overrideCode) => {
    const trimmedCode = (overrideCode ?? couponCode).trim();
    if (!trimmedCode) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    try {
      if (overrideCode) {
        setCouponCode(trimmedCode);
      }
      const response = await api.post('/coupons/validate', { code: trimmedCode });
      setCouponInfo(response.data.data);
    } catch (error) {
      const message =
        error.response?.data?.errors?.code?.[0] ||
        error.response?.data?.message ||
        'Failed to apply coupon.';
      setCouponInfo(null);
      setCouponError(message);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponInfo(null);
    setCouponError("");
  };

  const handleSelectCoupon = (code) => {
    if (!code) return;
    setCouponCode(code);
    setCouponError("");
  };

  const formatCouponDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getCouponStatusClasses = (status) => {
    if (status === "eligible") {
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (status === "used") {
      return "bg-slate-100 text-slate-700 border-slate-200";
    }
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

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
        loyalty_points_to_use: loyaltyPoints.toUse,
        coupon_code: couponInfo?.code || null,
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
        error.response?.data?.errors?.coupon_code?.[0] ||
        error.response?.data?.errors?.loyalty_points?.[0] ||
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
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
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
              <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 bg-clip-text text-transparent">
                ShopMart
              </span>
            </Link>
            <Link
              href="/products"
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
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
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
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Back to Orders
              </button>
            ) : (
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
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
                      className="inline-flex items-center justify-center px-5 py-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
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
              {!isOrderView && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Apply Coupon</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter coupon code"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || Boolean(couponInfo)}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {couponLoading ? "Applying..." : couponInfo ? "Applied" : "Apply"}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-sm text-rose-600 mt-2">{couponError}</p>
                  )}
                  {couponInfo && (
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-emerald-700 font-medium">
                        Applied {couponInfo.code} ({couponInfo.discount_percent}% off)
                      </span>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-emerald-700 font-semibold hover:text-emerald-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Available Coupons
                      </h4>
                      <span className="text-xs text-gray-500">
                        Cart subtotal: ${Number(couponsSubtotal || 0).toFixed(2)}
                      </span>
                    </div>
                    {couponsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600"></span>
                        Loading coupons...
                      </div>
                    ) : couponsError ? (
                      <p className="text-sm text-rose-600">{couponsError}</p>
                    ) : coupons.length === 0 ? (
                      <p className="text-sm text-gray-500">No active coupons right now.</p>
                    ) : (
                      <div className="space-y-3">
                        {coupons.map((coupon) => {
                          const isApplied =
                            couponInfo?.code?.toUpperCase() === coupon.code?.toUpperCase();
                          const canSelect = coupon.eligible && !couponInfo;
                          const rowClasses = canSelect
                            ? "cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/30"
                            : "cursor-not-allowed opacity-90";
                          return (
                            <div
                              key={coupon.id}
                              onClick={() => {
                                if (canSelect) {
                                  handleSelectCoupon(coupon.code);
                                }
                              }}
                              className={`rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors ${rowClasses}`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900">
                                      {coupon.code}
                                    </span>
                                    <span
                                      className={`text-xs font-semibold px-2 py-1 rounded-full border ${getCouponStatusClasses(
                                        coupon.status
                                      )}`}
                                    >
                                      {coupon.status_label}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {Number(coupon.discount_percent || 0).toFixed(2)}% off |
                                    Min ${Number(coupon.min_order_amount || 0).toFixed(2)} |
                                    Valid {formatCouponDate(coupon.starts_at)} -{" "}
                                    {formatCouponDate(coupon.ends_at)}
                                  </div>
                                  {coupon.reason && (
                                    <div className="text-xs text-amber-700 mt-1">
                                      {coupon.reason}
                                    </div>
                                  )}
                                  {!coupon.reason && coupon.min_order_remaining > 0 && (
                                    <div className="text-xs text-amber-700 mt-1">
                                      Spend ${Number(coupon.min_order_remaining).toFixed(2)} more to unlock.
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-slate-600">
                                  {isApplied ? "Applied" : canSelect ? "Tap to use code" : "Unavailable"}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loyalty Points Section */}
              {!isOrderView && showLoyaltySection && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Use Loyalty Points</h3>
                      <p className="text-sm text-gray-600">You have {loyaltyPoints.available} points available</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">${loyaltyPoints.discount}</div>
                      <div className="text-xs text-gray-500">Discount</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Points to use (multiples of 100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={loyaltyPoints.available}
                        step="100"
                        value={loyaltyPoints.toUse}
                        onChange={(e) => handleLoyaltyPointsChange(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter points (e.g., 100, 200, 300)"
                      />
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">100 points =</span>
                        <span className="font-semibold">$10 discount</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Your discount:</span>
                        <span className="font-bold text-green-600">${loyaltyPoints.discount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  {!isOrderView && totals.couponDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coupon Discount</span>
                      <span className="font-semibold text-emerald-600">-${totals.couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {!isOrderView && totals.loyaltyDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loyalty Discount</span>
                      <span className="font-semibold text-green-600">-${totals.loyaltyDiscount.toFixed(2)}</span>
                    </div>
                  )}
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
                      className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                      className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Back to Orders
                    </button>
                  )
                ) : (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={!canPlaceOrder}
                    className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

              {isOrderView && orderDetails?.loyalty_points_earned > 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        You'll earn {orderDetails.loyalty_points_earned} loyalty points!
                      </div>
                      <div className="text-sm text-gray-600">
                        Points will be added when your order is delivered.
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>
    </div>
  );
}



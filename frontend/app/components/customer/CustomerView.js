"use client";

import Link from "next/link";
import { useState, useEffect, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import PasswordInput from "@/components/PasswordInput";
import { getPricing } from "@/lib/pricing";
import NotificationDropdown from "@/components/NotificationDropdown";

const VALID_TABS = [
  "profile",
  "orders",
  "notifications",
  "addresses",
  "settings",
  "loyalty",
];

export default function CustomerView({ customer: initialCustomer }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, refreshUser } = useAuth();
  const [customer, setCustomer] = useState(initialCustomer);
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(() =>
    VALID_TABS.includes(tabParam) ? tabParam : "profile"
  );
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [productSuggestionsLoading, setProductSuggestionsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [cancellingOrders, setCancellingOrders] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [deletingNotifications, setDeletingNotifications] = useState({});
  const [clearingNotifications, setClearingNotifications] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    type: 'home',
    full_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'US',
    is_default: false
  });
  const [addressErrors, setAddressErrors] = useState({});

  const [loyaltyBalance, setLoyaltyBalance] = useState({
    points: 0,
    total_earned: 0,
    total_redeemed: 0,
    available_discount: 0,
    can_redeem: false,
  });
  const [loyaltyTransactions, setLoyaltyTransactions] = useState([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  const [profilePictureUploading, setProfilePictureUploading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    date_of_birth: ''
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const cartItemCount = cart.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );
  const trimmedProductSearch = productSearch.trim();
  const notificationsCacheKey = customer?.id
    ? `customer_notifications_${customer.id}`
    : null;
  const ordersSummaryCacheKey = customer?.id
    ? `customer_orders_summary_${customer.id}`
    : null;

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/gif",
          "image/webp",
        ];
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (!allowedTypes.includes(file.type)) {
          alert("Please upload a JPG, PNG, GIF, or WEBP image.");
          return;
        }
        if (file.size > maxSize) {
          alert("Image must be 10MB or smaller.");
          return;
        }
        setProfilePictureUploading(true);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('avatar', file);

        // Upload to backend
        const response = await api.post('/profile/avatar', formData);

        if (response.data.status === 'success') {
          // Update local state with the uploaded image URL
          const avatarUrl = response.data.data.avatar_url;
          setProfilePicture(avatarUrl);
          
          // Update customer data
          setCustomer(prev => ({
            ...prev,
            avatar: avatarUrl
          }));

          alert('Profile picture updated successfully!');
        }
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert(error.response?.data?.message || 'Failed to upload profile picture. Please try again.');
      } finally {
        setProfilePictureUploading(false);
      }
    }
  };

  const addToCart = async (product) => {
    if ((product.stock || 0) <= 0) {
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (product.stock && existing.quantity >= product.stock) {
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price || 0),
          image:
            product.image_url ||
            product.image ||
            '/images/default-product.svg',
          quantity: 1,
        },
      ];
    });

    try {
      await api.post('/cart/items', { product_id: product.id, quantity: 1 });
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert(error.response?.data?.message || 'Failed to add item to cart.');
      fetchCart();
    }
  };

  const removeFromCart = async (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));

    try {
      await api.delete(`/cart/items/${productId}`);
    } catch (error) {
      console.error('Error removing from cart:', error);
      alert(error.response?.data?.message || 'Failed to remove item.');
      fetchCart();
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    const product = products.find((item) => item.id === productId);
    const maxQuantity = product?.stock ?? Number.POSITIVE_INFINITY;

    setCart((prev) => {
      if (newQuantity <= 0) {
        return prev.filter((item) => item.id !== productId);
      }
      if (newQuantity > maxQuantity) {
        return prev;
      }
      return prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });

    try {
      await api.patch(`/cart/items/${productId}`, { quantity: newQuantity });
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert(error.response?.data?.message || 'Failed to update quantity.');
      fetchCart();
    }
  };

  const getCartTotal = () => {
    return cart
      .reduce((total, item) => {
        const price = Number(item.price || 0);
        return total + price * item.quantity;
      }, 0)
      .toFixed(2);
  };

  const handleCheckout = () => {
    router.push("/components/customer/checkout");
  };

  const handleSignOut = async () => {
    try {
      console.log("Customer page: Starting logout process...");
      await logout();
      console.log("Customer page: Logout completed, redirecting to home...");
      router.push("/");
      // Force page refresh to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("Customer page: Logout process error:", error);
      // Force logout even if there's an error
      localStorage.removeItem("token");
      window.location.href = "/";
    }
  };

  const mapOrderStatus = (status) => {
    if (status === "PENDING") return "Pending";
    if (status === "PAID") return "Processing";
    if (status === "SHIPPED") return "Shipped";
    if (status === "DELIVERED") return "Delivered";
    if (status === "CANCELLED") return "Cancelled";
    return status || "Pending";
  };

  const mapPaymentMethod = (method) => {
    if (method === "STRIPE") return "Online (Stripe)";
    if (method === "COD") return "Cash on Delivery";
    return method || "Cash on Delivery";
  };

  const mapPaymentStatus = (status) => {
    if (status === "PAID") return "Paid";
    if (status === "PENDING") return "Pending";
    if (status === "FAILED") return "Failed";
    if (status === "UNPAID") return "Unpaid";
    return status || "Unpaid";
  };

  const getPaymentStatusClasses = (status) => {
    if (status === "PAID") return "bg-green-100 text-green-800";
    if (status === "PENDING") return "bg-yellow-100 text-yellow-800";
    if (status === "FAILED") return "bg-rose-100 text-rose-800";
    return "bg-gray-100 text-gray-800";
  };

  const tabs = [
    {
      id: "profile",
      label: "Personal Info",
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    },
    {
      id: "orders",
      label: "Orders",
      icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0",
    },
    {
      id: "addresses",
      label: "Addresses",
      icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
    },
    {
      id: "loyalty",
      label: "Loyalty Rewards",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      id: "settings",
      label: "Settings",
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    },
  ];

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || "Menu";

  // Initialize profile form with customer data
  useEffect(() => {
    setProfileForm({
      full_name: customer.name || '',
      phone: customer.phone || '',
      date_of_birth: customer.date_of_birth || ''
    });
  }, [customer]);

  useEffect(() => {
    if (typeof window === "undefined" || !notificationsCacheKey) {
      return;
    }

    const cached = localStorage.getItem(notificationsCacheKey);
    if (!cached) {
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.notifications)) {
        setNotifications(parsed.notifications);
      }
      if (typeof parsed.unread_count === "number") {
        setUnreadNotifications(parsed.unread_count);
      }
    } catch (error) {
      console.error("Failed to parse cached notifications:", error);
    }
  }, [notificationsCacheKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !ordersSummaryCacheKey) {
      return;
    }

    const cached = localStorage.getItem(ordersSummaryCacheKey);
    if (!cached) {
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      if (
        typeof parsed.total_orders === "number" ||
        typeof parsed.total_spent === "number"
      ) {
        const totalSpentValue =
          typeof parsed.total_spent === "number" ? parsed.total_spent : 0;
        setCustomer((prev) => ({
          ...prev,
          totalOrders:
            typeof parsed.total_orders === "number"
              ? parsed.total_orders
              : prev.totalOrders,
          totalSpent:
            typeof parsed.total_spent === "number"
              ? `$${Number(totalSpentValue).toFixed(2)}`
              : prev.totalSpent,
        }));
      }
    } catch (error) {
      console.error("Failed to parse cached orders summary:", error);
    }
  }, [ordersSummaryCacheKey]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && VALID_TABS.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch addresses when Addresses tab is active
  useEffect(() => {
    if (activeTab === "addresses" && addresses.length === 0) {
      fetchAddresses();
    }
  }, [activeTab]);

  // Fetch categories when needed
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, []);

  // Fetch orders when needed
  useEffect(() => {
    if (activeTab === "notifications") {
      return;
    }
    if (activeTab === "orders" || activeTab === "profile") {
      fetchOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "orders" || !selectedOrderId) {
      return;
    }

    const row = document.getElementById(`order-row-${selectedOrderId}`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeTab, selectedOrderId, orders]);

  // Fetch notifications when Notifications tab is active
  useEffect(() => {
    if (activeTab === "notifications") {
      fetchNotifications();
    }
  }, [activeTab]);

  // Fetch loyalty data when Loyalty tab is active
  useEffect(() => {
    if (activeTab === "loyalty") {
      fetchLoyaltyData();
    }
  }, [activeTab]);

  // Fetch notifications once on load
  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    fetchOrdersSummary();
  }, [ordersSummaryCacheKey]);

  const fetchAddresses = async () => {
    try {
      // Check cache first
      const cacheKey = customer?.id ? `customer_addresses_${customer.id}` : null;
      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const cacheAge = Date.now() - new Date(parsed.cached_at).getTime();
            
            // Use cache immediately
            setAddresses(parsed.data || []);
            setAddressesLoading(false);
            console.log("Addresses loaded from cache:", { count: parsed.data?.length, cacheAge: Math.round(cacheAge / 1000) + "s" });
            
            // If cache is fresh (less than 5 minutes), don't fetch
            if (cacheAge < 300000) {
              return;
            }
          } catch (e) {
            console.error("Failed to parse cached addresses:", e);
          }
        }
      }
      
      setAddressesLoading(true);
      const response = await api.get('/addresses');
      const addressesData = response.data.data || [];
      setAddresses(addressesData);
      
      // Update cache
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: addressesData,
          cached_at: new Date().toISOString(),
        }));
        console.log("Addresses cached:", { count: addressesData.length });
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const trimmedSearch = productSearch.trim();
      const cacheKey = `products_cache_${trimmedSearch}_${selectedCategory || 'all'}`;
      
      // Check sessionStorage cache first for instant loading
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            // Use cache if less than 2 minutes old
            if (Date.now() - timestamp < 120000) {
              setProducts(data);
              setProductsLoading(false);
              return;
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }
      }

      setProductsLoading(true);
      const params = {
        limit: 50,
      };
      if (trimmedSearch) {
        params.search = trimmedSearch;
      }
      if (selectedCategory) {
        params.category_id = selectedCategory;
      }

      const response = await api.get('/customer/products', { params });
      const productsData = response.data.products || [];
      setProducts(productsData);
      
      // Cache the results
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: productsData,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchOrders = async ({ force = false } = {}) => {
    try {
      if (ordersLoading || (!force && ordersLoaded)) {
        return;
      }
      
      // Check cache first
      const cacheKey = customer?.id ? `customer_orders_${customer.id}` : null;
      if (cacheKey && !force) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const cacheAge = Date.now() - new Date(parsed.cached_at).getTime();
            
            // Use cache immediately
            setOrders(parsed.data || []);
            setOrdersLoaded(true);
            console.log("Orders loaded from cache:", { count: parsed.data?.length, cacheAge: Math.round(cacheAge / 1000) + "s" });
            
            // If cache is fresh (less than 2 minutes), don't fetch
            if (cacheAge < 120000) {
              return;
            }
          } catch (e) {
            console.error("Failed to parse cached orders:", e);
          }
        }
      }
      
      setOrdersLoading(true);
      const response = await api.get('/orders');
      const ordersData = response.data.orders || [];
      setOrders(ordersData);
      setOrdersLoaded(true);
      
      // Update cache
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: ordersData,
          cached_at: new Date().toISOString(),
        }));
        console.log("Orders cached:", { count: ordersData.length });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchOrdersSummary = async () => {
    if (!ordersSummaryCacheKey) {
      return;
    }
    try {
      const response = await api.get("/orders/summary");
      const totalOrders = response.data.total_orders || 0;
      const totalSpentValue = Number(response.data.total_spent || 0);
      setCustomer((prev) => ({
        ...prev,
        totalOrders,
        totalSpent: `$${totalSpentValue.toFixed(2)}`,
      }));

      if (typeof window !== "undefined") {
        localStorage.setItem(
          ordersSummaryCacheKey,
          JSON.stringify({
            total_orders: totalOrders,
            total_spent: totalSpentValue,
            cached_at: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      console.error("Error fetching orders summary:", error);
    }
  };

  const fetchNotifications = async ({ force = false } = {}) => {
    if (notificationsLoading || (!force && notificationsLoaded)) {
      return;
    }
    try {
      setNotificationsLoading(true);
      const response = await api.get("/notifications");
      const nextNotifications = response.data.notifications || [];
      const nextUnreadCount = response.data.unread_count || 0;
      setNotifications(nextNotifications);
      setUnreadNotifications(nextUnreadCount);

      if (typeof window !== "undefined" && notificationsCacheKey) {
        localStorage.setItem(
          notificationsCacheKey,
          JSON.stringify({
            notifications: nextNotifications,
            unread_count: nextUnreadCount,
            cached_at: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadNotifications(0);
    } finally {
      setNotificationsLoaded(true);
      setNotificationsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await api.get('/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchLoyaltyData = async () => {
    try {
      setLoyaltyLoading(true);
      const [balanceRes, historyRes] = await Promise.all([
        api.get('/loyalty/balance'),
        api.get('/loyalty/history?limit=50')
      ]);
      
      setLoyaltyBalance(balanceRes.data.data || {
        points: 0,
        total_earned: 0,
        total_redeemed: 0,
        available_discount: 0,
        can_redeem: false,
      });
      
      setLoyaltyTransactions(historyRes.data.transactions || []);
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const formatOrderLabel = (orderId) => {
    if (!orderId) return "Order";
    return `#ORD-${String(orderId).padStart(5, "0")}`;
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) {
      return;
    }

    if (!notification.is_read) {
      try {
        await api.patch(`/notifications/${notification.id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true, read_at: new Date().toISOString() }
              : item
          )
        );
        setUnreadNotifications((prev) => Math.max(prev - 1, 0));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    if (notification.order_id) {
      await fetchOrders({ force: true });
      setSelectedOrderId(notification.order_id);
      setExpandedOrderId(notification.order_id);
      setActiveTab("orders");
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at || new Date().toISOString(),
        }))
      );
      setUnreadNotifications(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      alert(error.response?.data?.message || "Failed to mark notifications as read.");
    }
  };

  const handleDeleteNotification = async (notificationId, wasUnread) => {
    if (!confirm("Delete this notification?")) {
      return;
    }

    setDeletingNotifications((prev) => ({ ...prev, [notificationId]: true }));
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );
      if (wasUnread) {
        setUnreadNotifications((prev) => Math.max(prev - 1, 0));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      alert(error.response?.data?.message || "Failed to delete notification.");
    } finally {
      setDeletingNotifications((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleClearNotifications = async () => {
    if (!confirm("Clear all notifications?")) {
      return;
    }

    setClearingNotifications(true);
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadNotifications(0);
    } catch (error) {
      console.error("Error clearing notifications:", error);
      alert(error.response?.data?.message || "Failed to clear notifications.");
    } finally {
      setClearingNotifications(false);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart');
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
        image: item.product?.image_url || '/images/default-product.svg',
        quantity: item.quantity,
      }));
      setCart(mapped);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCart([]);
    }
  };

  useEffect(() => {
    const activeOrders = orders.filter((order) => order.status !== "CANCELLED");
    const totalOrders = activeOrders.length;
    const totalSpentValue = activeOrders.reduce((sum, order) => {
      return sum + Number(order.total_amount || 0);
    }, 0);

    setCustomer((prev) => ({
      ...prev,
      totalOrders,
      totalSpent: `$${totalSpentValue.toFixed(2)}`,
    }));

    if (typeof window !== "undefined" && ordersSummaryCacheKey) {
      localStorage.setItem(
        ordersSummaryCacheKey,
        JSON.stringify({
          total_orders: totalOrders,
          total_spent: totalSpentValue,
          cached_at: new Date().toISOString(),
        })
      );
    }
  }, [orders, ordersSummaryCacheKey]);

  // Address form handlers
  const handleAddressFormChange = (field, value) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (addressErrors[field]) {
      setAddressErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateAddressForm = () => {
    const errors = {};

    if (!addressForm.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (!addressForm.phone.trim()) {
      errors.phone = 'Phone number is required';
    }

    if (!addressForm.address_line_1.trim()) {
      errors.address_line_1 = 'Address is required';
    }

    if (!addressForm.city.trim()) {
      errors.city = 'City is required';
    }

    if (!addressForm.state_province.trim()) {
      errors.state_province = 'State/Province is required';
    }

    if (!addressForm.postal_code.trim()) {
      errors.postal_code = 'Postal code is required';
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      type: 'home',
      full_name: customer.name || '',
      phone: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: 'US',
      is_default: addresses.length === 0 // Make first address default
    });
    setAddressErrors({});
    setShowAddressModal(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      type: address.type,
      full_name: address.full_name,
      phone: address.phone,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      city: address.city,
      state_province: address.state_province,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default
    });
    setAddressErrors({});
    setShowAddressModal(true);
  };

  const handleSaveAddress = async () => {
    if (!validateAddressForm()) {
      return;
    }

    try {
      if (editingAddress) {
        // Update existing address
        const response = await api.put(`/addresses/${editingAddress.id}`, addressForm);
        if (response.data.status === 'success') {
          setAddresses(prev => prev.map(addr => 
            addr.id === editingAddress.id ? response.data.data : addr
          ));
          
          // Invalidate addresses cache
          const cacheKey = customer?.id ? `customer_addresses_${customer.id}` : null;
          if (cacheKey) {
            localStorage.removeItem(cacheKey);
            console.log("Addresses cache invalidated after update");
          }
          
          alert('Address updated successfully!');
        }
      } else {
        // Create new address
        const response = await api.post('/addresses', addressForm);
        if (response.data.status === 'success') {
          setAddresses(prev => [...prev, response.data.data]);
          
          // Invalidate addresses cache
          const cacheKey = customer?.id ? `customer_addresses_${customer.id}` : null;
          if (cacheKey) {
            localStorage.removeItem(cacheKey);
            console.log("Addresses cache invalidated after creation");
          }
          
          alert('Address added successfully!');
        }
      }
      
      setShowAddressModal(false);
      setEditingAddress(null);
    } catch (error) {
      console.error('Error saving address:', error);
      
      if (error.response?.data?.errors) {
        setAddressErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Failed to save address. Please try again.');
      }
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (confirm('Are you sure you want to delete this address?')) {
      try {
        await api.delete(`/addresses/${addressId}`);
        setAddresses(prev => prev.filter(addr => addr.id !== addressId));
        
        // Invalidate addresses cache
        const cacheKey = customer?.id ? `customer_addresses_${customer.id}` : null;
        if (cacheKey) {
          localStorage.removeItem(cacheKey);
          console.log("Addresses cache invalidated after deletion");
        }
        
        alert('Address deleted successfully!');
      } catch (error) {
        console.error('Error deleting address:', error);
        alert(error.response?.data?.message || 'Failed to delete address.');
      }
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const response = await api.post(`/addresses/${addressId}/set-default`);
      if (response.data.status === 'success') {
        // Update addresses to reflect new default
        setAddresses(prev => prev.map(addr => ({
          ...addr,
          is_default: addr.id === addressId
        })));
        
        // Invalidate addresses cache
        const cacheKey = customer?.id ? `customer_addresses_${customer.id}` : null;
        if (cacheKey) {
          localStorage.removeItem(cacheKey);
          console.log("Addresses cache invalidated after setting default");
        }
        
        alert('Default address updated!');
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      alert(error.response?.data?.message || 'Failed to set default address.');
    }
  };

  const closeAddressModal = () => {
    setShowAddressModal(false);
    setEditingAddress(null);
    setAddressErrors({});
  };

  // Profile form handlers
  const handleProfileFormChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (profileErrors[field]) {
      setProfileErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateProfileForm = () => {
    const errors = {};

    if (!profileForm.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (profileForm.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(profileForm.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (profileForm.date_of_birth) {
      const birthDate = new Date(profileForm.date_of_birth);
      const today = new Date();
      if (birthDate >= today) {
        errors.date_of_birth = 'Date of birth must be in the past';
      }
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) {
      return;
    }

    try {
      setProfileSaving(true);
      
      const response = await api.put('/profile', profileForm);
      
      if (response.data.status === 'success') {
        // Update customer data
        setCustomer(prev => ({
          ...prev,
          name: profileForm.full_name,
          phone: profileForm.phone,
          date_of_birth: profileForm.date_of_birth
        }));
        
        // Refresh user data in AuthContext
        try {
          await refreshUser();
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        }
        
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      
      if (error.response?.data?.errors) {
        setProfileErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Failed to update profile. Please try again.');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  // Password form handlers
  const handlePasswordFormChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.current_password.trim()) {
      errors.current_password = 'Current password is required';
    }

    if (!passwordForm.new_password.trim()) {
      errors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'New password must be at least 8 characters';
    }

    if (!passwordForm.new_password_confirmation.trim()) {
      errors.new_password_confirmation = 'Password confirmation is required';
    } else if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      errors.new_password_confirmation = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdatePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      setPasswordSaving(true);
      
      const response = await api.put('/profile/password', passwordForm);
      
      if (response.data.status === 'success') {
        // Clear form
        setPasswordForm({
          current_password: '',
          new_password: '',
          new_password_confirmation: ''
        });
        
        alert('Password updated successfully!');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      
      if (error.response?.data?.errors) {
        setPasswordErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm("Cancel this order?")) {
      return;
    }

    setCancellingOrders((prev) => ({ ...prev, [orderId]: true }));
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      await fetchOrders({ force: true });
    } catch (error) {
      console.error("Error cancelling order:", error);
      const statusError = error.response?.data?.errors?.status?.[0];
      alert(statusError || error.response?.data?.message || "Failed to cancel order.");
      await fetchOrders({ force: true });
    } finally {
      setCancellingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
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

            {/* Right Side - Menu */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationDropdownOpen((prev) => !prev);
                    setTabMenuOpen(false);
                  }}
                  className="relative p-2 text-green-600 hover:text-green-700 transition-colors"
                  aria-label="Notifications"
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </button>
                <NotificationDropdown
                  notifications={notifications}
                  unreadCount={unreadNotifications}
                  onNotificationClick={handleNotificationClick}
                  onSeeAll={() => setActiveTab("notifications")}
                  isOpen={notificationDropdownOpen}
                  onToggle={() => setNotificationDropdownOpen((prev) => !prev)}
                  onClose={() => setNotificationDropdownOpen(false)}
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setTabMenuOpen((prev) => !prev);
                    setNotificationDropdownOpen(false);
                  }}
                  className="p-2 text-green-600 hover:text-green-700 transition-colors"
                  aria-label="Open menu"
                  aria-expanded={tabMenuOpen}
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
                {tabMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setTabMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${
                          activeTab === tab.id
                            ? "bg-green-50 text-green-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d={tab.icon}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="flex-1 text-left">{tab.label}</span>
                        {tab.id === "notifications" && unreadNotifications > 0 && (
                          <span className="min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {unreadNotifications > 99 ? "99+" : unreadNotifications}
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setTabMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Header */}
      <div className="pt-16 md:pt-20">
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/20 rounded-full blur-2xl"></div>
            <div className="absolute top-10 right-8 w-56 h-56 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <img
                  src={profilePicture || customer.avatar}
                  alt={customer.name}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-2xl bg-white ring-4 ring-white/20"
                />
                {profilePictureUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                <label
                  htmlFor="profile-picture-upload"
                  className={`absolute bottom-0 right-0 bg-white text-green-600 p-2.5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 ${
                    profilePictureUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </label>
                <input
                  type="file"
                  id="profile-picture-upload"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  disabled={profilePictureUploading}
                  className="hidden"
                />
              </div>

              <div className="text-center md:text-left flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs uppercase tracking-wide mb-3">
                  Premium Member
                </div>
                <h1 className="text-2xl sm:text-3xl font-black mb-2">{customer.name}</h1>
                <p className="text-white/90 mb-4 sm:mb-5 text-sm sm:text-base">
                  Member since {customer.joinDate}
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg">
                    <div className="text-xl sm:text-2xl font-bold">
                      {customer.statsLoading ? (
                        <div className="animate-pulse bg-white/30 h-8 w-8 rounded"></div>
                      ) : (
                        customer.totalOrders
                      )}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-white/80">Orders</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg">
                    <div className="text-xl sm:text-2xl font-bold">
                      {customer.statsLoading ? (
                        <div className="animate-pulse bg-white/30 h-8 w-20 rounded"></div>
                      ) : (
                        customer.totalSpent
                      )}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-white/80">Total Spent</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg">
                    <div className="text-xl sm:text-2xl font-bold">
                      {customer.statsLoading ? (
                        <div className="animate-pulse bg-white/30 h-8 w-6 rounded"></div>
                      ) : (
                        customer.loyaltyPoints
                      )}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-white/80">Points</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-16 md:top-20 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="text-2xl font-bold text-gray-900">
              {activeTabLabel}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-semibold text-gray-600 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => handleProfileFormChange('full_name', e.target.value)}
                        className={`w-full bg-gray-50 border text-gray-900 px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-gray-400 ${
                          profileErrors.full_name ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="Enter your full name"
                      />
                      {profileErrors.full_name && (
                        <p className="text-red-500 text-sm mt-1">{profileErrors.full_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-600 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={customer.email}
                        disabled
                        className="w-full bg-gray-100 border border-gray-200 text-gray-500 px-4 py-3 rounded-lg cursor-not-allowed"
                        title="Email cannot be changed"
                      />
                      <p className="text-gray-500 text-xs mt-1">Email address cannot be changed</p>
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-600 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => handleProfileFormChange('phone', e.target.value)}
                        className={`w-full bg-gray-50 border text-gray-900 px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-gray-400 ${
                          profileErrors.phone ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="Enter your phone number"
                      />
                      {profileErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">{profileErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-600 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={profileForm.date_of_birth}
                        onChange={(e) => handleProfileFormChange('date_of_birth', e.target.value)}
                        className={`w-full bg-gray-50 border text-gray-900 px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-gray-400 ${
                          profileErrors.date_of_birth ? 'border-red-500' : 'border-gray-200'
                        }`}
                      />
                      {profileErrors.date_of_birth && (
                        <p className="text-red-500 text-sm mt-1">{profileErrors.date_of_birth}</p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className={`mt-6 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all ${
                      profileSaving ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {profileSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <h3 className="text-xl font-bold mb-4">Loyalty Rewards</h3>
                  <div className="text-4xl font-bold mb-2">
                    {customer.statsLoading ? (
                      <div className="animate-pulse bg-white/30 h-12 w-12 rounded"></div>
                    ) : (
                      customer.loyaltyPoints
                    )}
                  </div>
                  <p className="text-white/80 mb-4">Points Available</p>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
                    <div className="text-sm mb-1">Next Reward</div>
                    <div className="w-full bg-white/30 rounded-full h-2 mb-2">
                      <div
                        className="bg-white h-2 rounded-full"
                        style={{ width: "75%" }}
                      ></div>
                    </div>
                    <div className="text-xs text-white/80">
                      250 points to go
                    </div>
                  </div>
                  <button className="w-full bg-white text-green-600 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
                    Redeem Points
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order History
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Order ID
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 hidden sm:table-cell">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 hidden md:table-cell">
                        Items
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ordersLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell">
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <div className="h-4 bg-gray-200 rounded w-14"></div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                          </td>
                        </tr>
                      ))
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                          No orders yet.
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        const orderDate = order.created_at
                          ? new Date(order.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })
                          : "N/A";
                        const itemCount = (order.items || []).reduce(
                          (sum, item) => sum + (item.quantity || 0),
                          0
                        );
                        const statusLabel = mapOrderStatus(order.status);
                        const paymentMethodLabel = mapPaymentMethod(order.payment_method);
                        const paymentStatusLabel = mapPaymentStatus(order.payment_status);
                        const paidAtLabel = order.paid_at
                          ? new Date(order.paid_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })
                          : "Not paid";
                        const paymentNote =
                          order.payment_method === "COD" &&
                          order.status === "DELIVERED"
                            ? "Paid on delivery"
                            : "";
                        const showDetails = expandedOrderId === order.id;
                        const isPending = order.status === "PENDING";
                        const isCancelling = Boolean(cancellingOrders[order.id]);
                        const isSelected = order.id === selectedOrderId;

                        return (
                          <Fragment key={order.id}>
                            <tr
                              id={`order-row-${order.id}`}
                              onClick={() =>
                                router.push(
                                  `/components/customer/checkout?order_id=${order.id}`
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  router.push(
                                    `/components/customer/checkout?order_id=${order.id}`
                                  );
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              className={`transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-green-50"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    router.push(
                                      `/components/customer/checkout?order_id=${order.id}`
                                    );
                                  }}
                                  className="text-gray-900 hover:text-green-700 hover:underline"
                                >
                                  {`#ORD-${String(order.id).padStart(5, "0")}`}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                                {orderDate}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                    statusLabel === "Delivered"
                                      ? "bg-green-100 text-green-800"
                                      : statusLabel === "Shipped"
                                      ? "bg-blue-100 text-blue-800"
                                      : statusLabel === "Pending"
                                      ? "bg-gray-100 text-gray-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                                {itemCount} items
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                ${Number(order.total_amount || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      router.push(
                                        `/components/customer/checkout?order_id=${order.id}`
                                      );
                                    }}
                                    className="text-green-600 font-semibold hover:text-green-700"
                                  >
                                  
                                  </button>
                                  {isPending && (
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        cancelOrder(order.id);
                                      }}
                                      disabled={isCancelling}
                                      className={`font-semibold ${
                                        isCancelling
                                          ? "text-gray-400 cursor-not-allowed"
                                          : "text-red-500 hover:text-red-600"
                                      }`}
                                    >
                                      {isCancelling ? "Cancelling..." : "Cancel"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {showDetails && (
                              <tr className="bg-gray-50">
                                <td colSpan="6" className="px-6 py-4">
                                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                      <div className="font-semibold text-gray-900">
                                        Order Details
                                      </div>
                                      <div className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                        {itemCount} items
                                      </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3 mb-4">
                                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <div className="text-xs uppercase text-gray-500">Payment Method</div>
                                        <div className="font-semibold text-gray-900">
                                          {paymentMethodLabel}
                                        </div>
                                      </div>
                                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <div className="text-xs uppercase text-gray-500">Payment Status</div>
                                        <span
                                          className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                            getPaymentStatusClasses(order.payment_status)
                                          }`}
                                        >
                                          {paymentStatusLabel}
                                        </span>
                                        {paymentNote && (
                                          <div className="mt-2 text-xs font-medium text-gray-500">
                                            {paymentNote}
                                          </div>
                                        )}
                                      </div>
                                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <div className="text-xs uppercase text-gray-500">Paid At</div>
                                        <div className="font-semibold text-gray-900">{paidAtLabel}</div>
                                      </div>
                                    </div>
                                    {order.items && order.items.length > 0 ? (
                                      <div className="space-y-3">
                                        {order.items.map((item) => {
                                          const itemPrice = Number(
                                            item.unit_price ||
                                              item.price ||
                                              item.product?.price ||
                                              0
                                          );
                                          const itemName =
                                            item.product?.name || item.name || "Item";
                                          const itemImage =
                                            item.product?.image_url ||
                                            item.product?.image ||
                                            item.image ||
                                            "/images/default-product.svg";
                                          return (
                                            <div
                                              key={item.id || `${order.id}-${item.product_id}`}
                                              className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-3"
                                            >
                                              <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                                                  <img
                                                    src={itemImage}
                                                    alt={itemName}
                                                    className="h-full w-full object-cover"
                                                  />
                                                </div>
                                                <div>
                                                  <div className="font-semibold text-gray-900">
                                                    {itemName}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    Unit ${itemPrice.toFixed(2)} Â· Qty {item.quantity}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-xs text-gray-500">
                                                  Line total
                                                </div>
                                                <div className="font-semibold text-gray-900">
                                                  ${(itemPrice * (item.quantity || 0)).toFixed(2)}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
                                        No items available for this order.
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Notifications
                </h2>
                <div className="flex items-center gap-3">
                  {unreadNotifications > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="px-4 py-2 text-sm font-semibold text-green-700 border border-green-200 rounded-full hover:bg-green-50 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearNotifications}
                      disabled={clearingNotifications}
                      className="px-4 py-2 text-sm font-semibold text-rose-700 border border-rose-200 rounded-full hover:bg-rose-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {clearingNotifications ? "Clearing..." : "Clear all"}
                    </button>
                  )}
                  <button
                    onClick={() => fetchNotifications({ force: true })}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {!notificationsLoaded && notifications.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const orderLabel = formatOrderLabel(notification.order_id);
                    const createdAt = notification.created_at
                      ? new Date(notification.created_at).toLocaleString(
                          "en-US",
                          {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "N/A";

                    const isDeleting = Boolean(
                      deletingNotifications[notification.id]
                    );

                    return (
                      <div
                        key={notification.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNotificationClick(notification)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleNotificationClick(notification);
                          }
                        }}
                        className={`w-full text-left px-6 py-4 transition-colors cursor-pointer ${
                          notification.is_read
                            ? "bg-white hover:bg-green-50/40"
                            : "bg-green-50 hover:bg-green-100/70"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {notification.title || "Notification"}
                              </span>
                              {!notification.is_read && (
                                <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                  New
                                </span>
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {createdAt}
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteNotification(
                                  notification.id,
                                  !notification.is_read
                                );
                              }}
                              disabled={isDeleting}
                              className="mt-2 px-2 py-1 text-rose-600 hover:text-rose-700"
                              aria-label="Delete notification"
                            >
                              {isDeleting ? (
                                "..."
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path
                                    d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 01-2 2H9a2 2 0 01-2-2V6m3 4v8m4-8v8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                        {notification.order_id && (
                          <div className="mt-2 text-xs font-semibold text-green-700">
                            View {orderLabel} in orders
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === "addresses" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Saved Addresses
                </h2>
                <button 
                  onClick={handleAddAddress}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  + Add New Address
                </button>
              </div>
              
              {addressesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : addresses.length === 0 ? (
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No addresses saved</h3>
                    <p className="text-gray-600 mb-4">
                      Add your first address to make checkout faster
                    </p>
                    <button
                      onClick={handleAddAddress}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                    >
                      Add Your First Address
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:border-green-500 transition-colors relative"
                    >
                      {address.is_default && (
                        <span className="absolute top-4 right-4 bg-green-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                          Default
                        </span>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-green-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              d={address.type === 'work' 
                                ? "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                                : "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M9 22V12h6v10"
                              }
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1 capitalize">
                            {address.type} Address
                          </h3>
                          <p className="text-gray-900 text-sm font-medium mb-1">
                            {address.full_name}
                          </p>
                          <p className="text-gray-500 text-sm mb-1">
                            {address.address_line_1}
                          </p>
                          {address.address_line_2 && (
                            <p className="text-gray-500 text-sm mb-1">
                              {address.address_line_2}
                            </p>
                          )}
                          <p className="text-gray-500 text-sm mb-1">
                            {address.city}, {address.state_province} {address.postal_code}
                          </p>
                          <p className="text-gray-500 text-sm mb-1">{address.country}</p>
                          <p className="text-gray-500 text-sm">{address.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                        {!address.is_default && (
                          <button 
                            onClick={() => handleSetDefaultAddress(address.id)}
                            className="flex-1 px-3 py-2 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm"
                          >
                            Set Default
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditAddress(address)}
                          className="flex-1 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteAddress(address.id)}
                          className="flex-1 px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Security Settings
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Current Password *
                    </label>
                    <PasswordInput
                      value={passwordForm.current_password}
                      onChange={(e) => handlePasswordFormChange('current_password', e.target.value)}
                      placeholder="Enter current password"
                      error={passwordErrors.current_password}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      New Password *
                    </label>
                    <PasswordInput
                      value={passwordForm.new_password}
                      onChange={(e) => handlePasswordFormChange('new_password', e.target.value)}
                      placeholder="Enter new password"
                      error={passwordErrors.new_password}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Confirm New Password *
                    </label>
                    <PasswordInput
                      value={passwordForm.new_password_confirmation}
                      onChange={(e) => handlePasswordFormChange('new_password_confirmation', e.target.value)}
                      placeholder="Confirm new password"
                      error={passwordErrors.new_password_confirmation}
                    />
                  </div>
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={passwordSaving}
                    className={`w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all ${
                      passwordSaving ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {passwordSaving ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating Password...
                      </div>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Notifications
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      label: "Order Updates",
                      desc: "Get notified about order status changes",
                    },
                    {
                      label: "Promotions",
                      desc: "Receive special offers and discounts",
                    },
                    {
                      label: "Newsletter",
                      desc: "Weekly newsletter with new products",
                    },
                    {
                      label: "SMS Alerts",
                      desc: "Receive text messages for important updates",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.label}
                        </div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={index < 2}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loyalty Tab */}
          {activeTab === "loyalty" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-2">Loyalty Rewards</h2>
                <p className="text-white/90 mb-6">Earn 5% points on every purchase!</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-4xl font-bold mb-2">{loyaltyBalance.points}</div>
                    <div className="text-white/80">Available Points</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-4xl font-bold mb-2">${loyaltyBalance.available_discount}</div>
                    <div className="text-white/80">Available Discount</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-4xl font-bold mb-2">{loyaltyBalance.total_earned}</div>
                    <div className="text-white/80">Total Earned</div>
                  </div>
                </div>
                
                <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm">
                    💡 <strong>How it works:</strong> Earn 5% points on every order. 
                    Redeem 100 points for $10 off your next purchase!
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h3>
                
                {loyaltyLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  </div>
                ) : loyaltyTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium">No transactions yet</p>
                    <p className="text-sm">Start shopping to earn loyalty points!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loyaltyTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'earned' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {transaction.type === 'earned' ? '+' : '-'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{transaction.description}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(transaction.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${
                          transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'earned' ? '+' : ''}{transaction.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h2>
                <button
                  onClick={closeAddressModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Address Type */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Type
                  </label>
                  <select
                    value={addressForm.type}
                    onChange={(e) => handleAddressFormChange('type', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={addressForm.full_name}
                    onChange={(e) => handleAddressFormChange('full_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                      addressErrors.full_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter full name"
                  />
                  {addressErrors.full_name && (
                    <p className="text-red-500 text-sm mt-1">{addressErrors.full_name}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => handleAddressFormChange('phone', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                      addressErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {addressErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{addressErrors.phone}</p>
                  )}
                </div>

                {/* Address Line 1 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={addressForm.address_line_1}
                    onChange={(e) => handleAddressFormChange('address_line_1', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                      addressErrors.address_line_1 ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Street address, P.O. box, company name, c/o"
                  />
                  {addressErrors.address_line_1 && (
                    <p className="text-red-500 text-sm mt-1">{addressErrors.address_line_1}</p>
                  )}
                </div>

                {/* Address Line 2 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={addressForm.address_line_2}
                    onChange={(e) => handleAddressFormChange('address_line_2', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => handleAddressFormChange('city', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                      addressErrors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter city"
                  />
                  {addressErrors.city && (
                    <p className="text-red-500 text-sm mt-1">{addressErrors.city}</p>
                  )}
                </div>

                {/* State/Province */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province *
                  </label>
                  <input
                    type="text"
                    value={addressForm.state_province}
                    onChange={(e) => handleAddressFormChange('state_province', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                      addressErrors.state_province ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter state or province"
                  />
                  {addressErrors.state_province && (
                    <p className="text-red-500 text-sm mt-1">{addressErrors.state_province}</p>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={addressForm.postal_code}
                    onChange={(e) => handleAddressFormChange('postal_code', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                      addressErrors.postal_code ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter postal code"
                  />
                  {addressErrors.postal_code && (
                    <p className="text-red-500 text-sm mt-1">{addressErrors.postal_code}</p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    value={addressForm.country}
                    onChange={(e) => handleAddressFormChange('country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="IT">Italy</option>
                    <option value="ES">Spain</option>
                    <option value="JP">Japan</option>
                    <option value="CN">China</option>
                    <option value="IN">India</option>
                    <option value="BR">Brazil</option>
                    <option value="MX">Mexico</option>
                    <option value="BD">Bangladesh</option>
                    <option value="PK">Pakistan</option>
                    <option value="IN">India</option>
                    <option value="CN">China</option>
                    <option value="JP">Japan</option>
                    <option value="KR">Korea</option>
                    <option value="TW">Taiwan</option>
                    <option value="HK">Hong Kong</option>
                    <option value="MO">Macau</option>
                  </select>
                </div>

                {/* Default Address Checkbox */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addressForm.is_default}
                      onChange={(e) => handleAddressFormChange('is_default', e.target.checked)}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Set as default address
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-4 justify-end">
              <button
                onClick={closeAddressModal}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium"
              >
                {editingAddress ? 'Update Address' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







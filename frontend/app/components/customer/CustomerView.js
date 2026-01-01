"use client";

import Link from "next/link";
import { useState, useEffect, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import PasswordInput from "@/components/PasswordInput";

export default function CustomerView({ customer: initialCustomer }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, refreshUser } = useAuth();
  const [customer, setCustomer] = useState(initialCustomer);

  const [activeTab, setActiveTab] = useState("profile");
  const [profilePicture, setProfilePicture] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [cancellingOrders, setCancellingOrders] = useState({});
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

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setProfilePictureUploading(true);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('avatar', file);

        // Upload to backend
        const response = await api.post('/profile/avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

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

  // Initialize profile form with customer data
  useEffect(() => {
    setProfileForm({
      full_name: customer.name || '',
      phone: customer.phone || '',
      date_of_birth: customer.date_of_birth || ''
    });
  }, [customer]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["profile", "orders", "shop", "addresses", "settings"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch addresses when Addresses tab is active
  useEffect(() => {
    if (activeTab === "addresses" && addresses.length === 0) {
      fetchAddresses();
    }
  }, [activeTab]);

  // Fetch products when Shop tab is active or filters change
  useEffect(() => {
    if (activeTab !== "shop") {
      return;
    }

    const timeout = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timeout);
  }, [activeTab, productSearch, selectedCategory]);

  // Fetch categories when Shop tab is active
  useEffect(() => {
    if (activeTab === "shop" && categories.length === 0) {
      fetchCategories();
    }
  }, [activeTab]);

  // Fetch orders when Orders tab is active
  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [activeTab]);

  // Fetch orders once on load to keep stats in sync after refresh
  useEffect(() => {
    fetchOrders();
  }, []);

  // Load cart from database on mount
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchAddresses = async () => {
    try {
      setAddressesLoading(true);
      const response = await api.get('/addresses');
      setAddresses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const params = {
        limit: 50,
      };
      const trimmedSearch = productSearch.trim();
      if (trimmedSearch) {
        params.search = trimmedSearch;
      }
      if (selectedCategory) {
        params.category_id = selectedCategory;
      }

      const response = await api.get('/customer/products', { params });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
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

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart');
      const items = response.data.cart?.items || [];
      const mapped = items.map((item) => ({
        id: item.product_id,
        name: item.product?.name,
        price: Number(item.unit_price || item.product?.price || 0),
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
  }, [orders]);

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
          alert('Address updated successfully!');
        }
      } else {
        // Create new address
        const response = await api.post('/addresses', addressForm);
        if (response.data.status === 'success') {
          setAddresses(prev => [...prev, response.data.data]);
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
      await fetchOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert(error.response?.data?.message || "Failed to cancel order.");
    } finally {
      setCancellingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

            {/* Right Side - Sign Out */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSignOut}
                className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Header */}
      <div className="pt-20">
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative group">
                <img
                  src={profilePicture || customer.avatar}
                  alt={customer.name}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-white"
                />
                {profilePictureUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                <label
                  htmlFor="profile-picture-upload"
                  className={`absolute bottom-0 right-0 bg-white text-green-600 p-2 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 ${
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
                <h1 className="text-3xl font-black mb-2">{customer.name}</h1>
                <p className="text-white/90 mb-4">
                  Member since {customer.joinDate}
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <div className="text-2xl font-bold">
                      {customer.totalOrders}
                    </div>
                    <div className="text-sm text-white/80">Orders</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <div className="text-2xl font-bold">
                      {customer.totalSpent}
                    </div>
                    <div className="text-sm text-white/80">Total Spent</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <div className="text-2xl font-bold">
                      {customer.loyaltyPoints}
                    </div>
                    <div className="text-sm text-white/80">Points</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 sticky top-20 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-8 overflow-x-auto">
              {[
                {
                  id: "profile",
                  label: "Profile",
                  icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                },
                {
                  id: "orders",
                  label: "Orders",
                  icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
                },
                {
                  id: "shop",
                  label: "Shop",
                  icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
                },
                {
                  id: "addresses",
                  label: "Addresses",
                  icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
                },
                {
                  id: "settings",
                  label: "Settings",
                  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-green-600 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
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
                      d={tab.icon}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-bold text-gray-600 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => handleProfileFormChange('full_name', e.target.value)}
                        className={`w-full bg-gray-50 border text-gray-900 px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder-gray-400 ${
                          profileErrors.full_name ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="Enter your full name"
                      />
                      {profileErrors.full_name && (
                        <p className="text-red-500 text-sm mt-1">{profileErrors.full_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-2">
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
                      <label className="block font-bold text-gray-600 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => handleProfileFormChange('phone', e.target.value)}
                        className={`w-full bg-gray-50 border text-gray-900 px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder-gray-400 ${
                          profileErrors.phone ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="Enter your phone number"
                      />
                      {profileErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">{profileErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={profileForm.date_of_birth}
                        onChange={(e) => handleProfileFormChange('date_of_birth', e.target.value)}
                        className={`w-full bg-gray-50 border text-gray-900 px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder-gray-400 ${
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
                <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">Loyalty Rewards</h3>
                  <div className="text-4xl font-bold mb-2">
                    {customer.loyaltyPoints}
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
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Order ID
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Items
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Details
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
                          <td className="px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                          </td>
                          <td className="px-6 py-4">
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
                        const showDetails = expandedOrderId === order.id;
                        const isPending = order.status === "PENDING";
                        const isCancelling = Boolean(cancellingOrders[order.id]);

                        return (
                          <Fragment key={order.id}>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {`#ORD-${String(order.id).padStart(5, "0")}`}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
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
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {itemCount} items
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                ${Number(order.total_amount || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => toggleOrderDetails(order.id)}
                                    className="text-green-600 font-semibold hover:text-green-700"
                                  >
                                    {showDetails ? "Hide" : "View"}
                                  </button>
                                  {isPending && (
                                    <button
                                      onClick={() => cancelOrder(order.id)}
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
                                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="font-semibold text-gray-900">
                                        Order Details
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {itemCount} items
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
                                          return (
                                            <div
                                              key={item.id || `${order.id}-${item.product_id}`}
                                              className="flex items-center justify-between text-sm"
                                            >
                                              <div>
                                                <div className="font-medium text-gray-900">
                                                  {item.product?.name || item.name || "Item"}
                                                </div>
                                                <div className="text-gray-500">
                                                  ${itemPrice.toFixed(2)} x {item.quantity}
                                                </div>
                                              </div>
                                              <div className="font-semibold text-gray-900">
                                                ${(itemPrice * (item.quantity || 0)).toFixed(2)}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500">
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

          {/* Shop Tab */}
          {activeTab === "shop" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Shop Products
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Search and filter by category.
                  </p>
                </div>
                <div className="relative">
                  <Link
                    href="/components/customer/cart"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all"
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
                    Cart ({cartItemCount})
                  </Link>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Search products
                  </label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by name, category, or description..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
                <div className="w-full lg:w-72">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  >
                    <option value="">All Categories</option>
                    {categoriesLoading ? (
                      <option value="" disabled>
                        Loading categories...
                      </option>
                    ) : (
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {productsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-pulse">
                      <div className="w-full h-48 bg-gray-200"></div>
                      <div className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="flex items-center justify-between">
                          <div className="h-8 bg-gray-200 rounded w-20"></div>
                          <div className="h-10 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
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
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      {productSearch.trim() || selectedCategory
                        ? "No matching products"
                        : "No products available"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {productSearch.trim() || selectedCategory
                        ? "Try a different search or category."
                        : "Products will appear here once they are added to the store"}
                    </p>
                    <button
                      onClick={fetchProducts}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Refresh Products
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {products.map((product) => {
                    const cartItem = cart.find((item) => item.id === product.id);
                    const cartQuantity = cartItem?.quantity || 0;
                    const availableStock = Math.max(
                      0,
                      (product.stock || 0) - cartQuantity
                    );
                    return (
                      <div
                        key={product.id}
                        className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden hover:shadow-green-200/50 transition-all group"
                      >
                        <Link
                          href={`/productDetails/${product.id}`}
                          className="relative block"
                        >
                          <img
                            src={product.image || product.image_url || '/images/default-product.svg'}
                            alt={product.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.target.src = '/images/default-product.svg';
                            }}
                          />
                          {product.badge && (
                            <div className={`absolute top-3 left-3 ${product.badgeColor || 'bg-red-500'} text-white px-2 py-1 rounded-full text-xs font-bold`}>
                              {product.badge}
                            </div>
                          )}
                        </Link>
                        <div className="p-6">
                          <div className="text-sm text-green-600 font-medium mb-2">
                            {product.category}
                          </div>
                          <Link
                            href={`/productDetails/${product.id}`}
                            className="text-lg font-bold text-gray-900 mb-2 hover:text-green-700 transition-colors block"
                          >
                            {product.name}
                          </Link>
                          {product.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex text-yellow-400">
                              {"★".repeat(product.rating || 4)}
                              {"☆".repeat(5 - (product.rating || 4))}
                            </div>
                            <span className="text-sm text-gray-400 ml-1">
                              ({product.reviews || '0'})
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-2xl font-bold text-gray-900">
                              {product.price}
                            </div>
                            <div className="text-sm text-gray-600">
                              {availableStock > 0
                                ? `${availableStock} in stock`
                                : 'Out of stock'}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            {cartItem ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      product.id,
                                      cartItem.quantity - 1
                                    )
                                  }
                                  className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200"
                                >
                                  -
                                </button>
                                <span className="font-bold text-gray-900 px-3">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      product.id,
                                      cartItem.quantity + 1
                                    )
                                  }
                                  disabled={availableStock === 0}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    availableStock === 0
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                      : 'bg-green-600 text-white hover:bg-green-500'
                                  }`}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(product)}
                                disabled={availableStock === 0}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                  availableStock > 0
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                {availableStock > 0 ? 'Add to Cart' : 'Unavailable'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

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



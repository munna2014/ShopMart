import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";
import * as XLSX from "xlsx";
import AdminProductImage from "./AdminProductImage";


export default function AdminDashboard() {
  const createEmptyBulkProduct = () => ({
    name: "",
    category_id: "",
    price: "",
    stock_quantity: "",
    sku: "",
    color: "",
    material: "",
    brand: "",
    size: "",
    weight: "",
    dimensions: "",
    discount_percent: "",
    discount_starts_at: "",
    discount_ends_at: "",
    image_url: "",
    description: "",
    highlight_1: "",
    highlight_2: "",
    highlight_3: "",
    highlight_4: "",
  });

  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const { user, loading, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form state for adding products
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    category_id: '',
    sku: '',
    color: '',
    material: '',
    brand: '',
    size: '',
    weight: '',
    dimensions: '',
    highlight_1: '',
    highlight_2: '',
    highlight_3: '',
    highlight_4: '',
    discount_percent: '',
    discount_starts_at: '',
    discount_ends_at: '',
    image_url: '',
    image: null
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for real data
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalOrders: 0,
    revenue: "$0.00",
  });

  const [products, setProducts] = useState([]);
  const [productsPagination, setProductsPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
    from: 0,
    to: 0,
  });
  const [productsLoading, setProductsLoading] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([createEmptyBulkProduct()]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkRowErrors, setBulkRowErrors] = useState({});
  const bulkFileInputRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingUsersLoading, setPendingUsersLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState({});
  const [orders, setOrders] = useState([]);
  const [deletingOrders, setDeletingOrders] = useState({});
  const [categories, setCategories] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
      return;
    }
    if (!tab && activeTab !== "dashboard") {
      setActiveTab("dashboard");
    }
  }, [location.search, activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(location.search);
    if (tabId === "dashboard") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    navigate({ pathname: "/", search: params.toString() }, { replace: true });
  };

  const handleProductsPageChange = (nextPage) => {
    const safePage = Math.max(
      1,
      Math.min(nextPage, productsPagination.lastPage || 1)
    );
    setProductsPagination((prev) => ({
      ...prev,
      currentPage: safePage,
    }));
  };

  const handleProductsPerPageChange = (event) => {
    const perPage = Number(event.target.value) || 15;
    setProductsPagination((prev) => ({
      ...prev,
      perPage,
      currentPage: 1,
    }));
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats({
        totalProducts: response.data.stats.total_products,
        totalCustomers: response.data.stats.total_customers,
        totalOrders: response.data.stats.total_orders,
        revenue: response.data.stats.revenue,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // Fetch customers data
  const fetchCustomers = async () => {
    try {
      const response = await api.get('/admin/users');
      setCustomers(response.data.users);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      setPendingUsersLoading(true);
      const response = await api.get('/admin/pending-users');
      setPendingUsers(response.data.pending_users || []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      setPendingUsers([]);
    } finally {
      setPendingUsersLoading(false);
    }
  };

  // Fetch categories data
  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      const nextCategories = response.data.categories || [];
      setCategories(nextCategories);
      return nextCategories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  };

  // Fetch products data
  const fetchProducts = async ({ page, perPage } = {}) => {
    const pageToLoad = page || productsPagination.currentPage || 1;
    const perPageToLoad = perPage || productsPagination.perPage || 15;

    try {
      setProductsLoading(true);
      const response = await api.get('/admin/products', {
        params: {
          page: pageToLoad,
          per_page: perPageToLoad,
        },
      });
      const payload = response.data.data || {};
      setProducts(payload.data || []);
      setProductsPagination((prev) => ({
        ...prev,
        currentPage: payload.current_page || pageToLoad,
        lastPage: payload.last_page || 1,
        perPage: payload.per_page || perPageToLoad,
        total: payload.total || 0,
        from: payload.from || 0,
        to: payload.to || 0,
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const mapOrderStatus = (status) => {
    if (status === "PENDING") return "Pending";
    if (status === "DELIVERED") return "Delivered";
    if (status === "SHIPPED") return "Shipped";
    if (status === "PAID") return "Processing";
    if (status === "CANCELLED") return "Cancelled";
    return status || "Processing";
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

  const getPaymentBadgeClass = (status) => {
    if (status === "PAID") return "bg-emerald-200 text-emerald-900 ring-emerald-300";
    if (status === "PENDING") return "bg-amber-200 text-amber-900 ring-amber-300";
    if (status === "FAILED") return "bg-rose-200 text-rose-900 ring-rose-300";
    return "bg-slate-200 text-slate-900 ring-slate-300";
  };

  const mapStatusToApi = (status) => {
    if (status === "Pending") return "PENDING";
    if (status === "Processing") return "PAID";
    if (status === "Shipped") return "SHIPPED";
    if (status === "Delivered") return "DELIVERED";
    if (status === "Cancelled") return "CANCELLED";
    return "PENDING";
  };

  const formatDate = (value, withTime = false) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    if (withTime) {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Fetch orders data
  const fetchOrders = async () => {
    try {
      const response = await api.get('/admin/orders');
      const mappedOrders = (response.data.orders || []).map((order) => {
        const orderDate = order.created_at
          ? new Date(order.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })
          : "N/A";

        return {
          id: order.id,
          orderId: `#ORD-${String(order.id).padStart(5, "0")}`,
          customer: order.user?.full_name || "Customer",
          customerEmail: order.user?.email || "",
          date: orderDate,
          total: `$${Number(order.total_amount || 0).toFixed(2)}`,
          status: mapOrderStatus(order.status),
          paymentMethod: mapPaymentMethod(order.payment_method),
          paymentStatus: mapPaymentStatus(order.payment_status),
          rawPaymentStatus: order.payment_status,
          paymentNote:
            order.payment_method === "COD" && order.status === "DELIVERED"
              ? "Paid on delivery"
              : "",
          products: (order.items || []).map((item) => ({
            name: item.product?.name || "Product",
            quantity: item.quantity,
            price: `$${Number(item.unit_price || 0).toFixed(2)}`,
            imageUrl: item.product?.image_url || item.product?.image || "",
          })),
        };
      });
      setOrders(mappedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    }
  };

  const loadActiveTab = async (tab) => {
    setDataLoading(true);
    try {
      if (tab === "dashboard") {
        await fetchDashboardData();
        return;
      }
      if (tab === "products") {
        const needsCategories = categories.length === 0;
        if (needsCategories) {
          await fetchCategories();
        }
        return;
      }
      if (tab === "orders") {
        if (orders.length === 0) {
          await fetchOrders();
        }
        return;
      }
      if (tab === "tracking") {
        if (orders.length === 0) {
          await fetchOrders();
        }
        return;
      }
      if (tab === "customers") {
        if (customers.length === 0) {
          await fetchCustomers();
        }
        if (pendingUsers.length === 0) {
          await fetchPendingUsers();
        }
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Check admin access on component mount
  useEffect(() => {
    console.log("Admin page useEffect:", { 
      loading, 
      isAuthenticated, 
      user: !!user, 
      userRoles: user?.roles?.map(r => r.name),
      isAdmin: user ? isAdmin() : 'unknown' 
    });
    
    if (!loading) {
      // Add a small delay to ensure auth state is stable after refresh
      const checkAccess = () => {
        // Only redirect if we're certain about the authentication state
        if (!isAuthenticated) {
          console.log("Not authenticated, redirecting to login");
          setDataLoading(false);
          navigate("/login");
          return;
        }
        
        // Wait for user data to be loaded before checking admin status
        if (isAuthenticated && user) {
          console.log("Checking admin status for user:", user.full_name, "Roles:", user.roles?.map(r => r.name));
          
          if (!isAdmin()) {
            console.log("User is not admin, redirecting to login");
            alert("Access denied. Admin privileges required.");
            setDataLoading(false);
            navigate("/login");
            return;
          }
          console.log("User is authenticated admin");
        } else if (isAuthenticated && !user) {
          console.log("Authenticated but user data not loaded yet, waiting...");
          // Wait a bit more for user data to load
          setTimeout(checkAccess, 500);
        }
      };
      
      // Small delay to ensure state is stable after refresh
      setTimeout(checkAccess, 100);
    }
  }, [loading, isAuthenticated, user, isAdmin, navigate]);

  useEffect(() => {
    if (!loading && isAuthenticated && user && isAdmin()) {
      loadActiveTab(activeTab);
    }
  }, [activeTab, loading, isAuthenticated, user, isAdmin]);

  useEffect(() => {
    if (activeTab !== "products") {
      return;
    }
    if (loading || !isAuthenticated || !user || !isAdmin()) {
      return;
    }

    fetchProducts({
      page: productsPagination.currentPage,
      perPage: productsPagination.perPage,
    });
  }, [
    activeTab,
    productsPagination.currentPage,
    productsPagination.perPage,
    loading,
    isAuthenticated,
    user,
    isAdmin,
  ]);


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        setFormErrors(prev => ({
          ...prev,
          image: 'Please select a PNG or JPG image file'
        }));
        return;
      }

      if (file.size > maxSize) {
        setFormErrors(prev => ({
          ...prev,
          image: 'Image file size must be less than 10MB'
        }));
        return;
      }

      // Clear image error if validation passes
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.image;
        return newErrors;
      });

      // Set the file in form state
      setProductForm(prev => ({ ...prev, image: file }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setProductForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!productForm.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!productForm.category_id) {
      errors.category_id = 'Please select a category';
    }

    if (!productForm.price || isNaN(productForm.price) || parseFloat(productForm.price) <= 0) {
      errors.price = 'Please enter a valid price greater than 0';
    }

    if (productForm.stock_quantity === '' || isNaN(productForm.stock_quantity) || parseInt(productForm.stock_quantity) < 0) {
      errors.stock_quantity = 'Please enter a valid stock quantity (0 or greater)';
    }

    if (productForm.discount_percent !== '') {
      const percentValue = Number(productForm.discount_percent);
      if (Number.isNaN(percentValue) || percentValue < 0 || percentValue > 100) {
        errors.discount_percent = 'Discount must be between 0 and 100';
      }
    }

    if (productForm.image_url.trim()) {
      try {
        new URL(productForm.image_url.trim());
      } catch (error) {
        errors.image_url = 'Please enter a valid image URL';
      }
    }

    if (productForm.discount_starts_at && productForm.discount_ends_at) {
      if (productForm.discount_ends_at < productForm.discount_starts_at) {
        errors.discount_ends_at = 'End date must be on or after start date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddProduct = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Debug: Log form values before submission
      console.log('Form values before submission:', {
        name: productForm.name,
        description: productForm.description,
        price: productForm.price,
        stock_quantity: productForm.stock_quantity,
        category_id: productForm.category_id,
        sku: productForm.sku,
        color: productForm.color,
        material: productForm.material,
        brand: productForm.brand,
        size: productForm.size,
        weight: productForm.weight,
        dimensions: productForm.dimensions,
        highlight_1: productForm.highlight_1,
        highlight_2: productForm.highlight_2,
        highlight_3: productForm.highlight_3,
        highlight_4: productForm.highlight_4,
        discount_percent: productForm.discount_percent,
        discount_starts_at: productForm.discount_starts_at,
        discount_ends_at: productForm.discount_ends_at,
        image_url: productForm.image_url,
        image: productForm.image ? productForm.image.name : 'No image'
      });

      const formData = new FormData();
      formData.append('name', productForm.name.trim());
      formData.append('description', productForm.description.trim());
      formData.append('price', parseFloat(productForm.price));
      formData.append('stock_quantity', parseInt(productForm.stock_quantity));
      formData.append('category_id', productForm.category_id);
      formData.append('sku', productForm.sku.trim());
      formData.append('color', productForm.color.trim());
      formData.append('material', productForm.material.trim());
      formData.append('brand', productForm.brand.trim());
      formData.append('size', productForm.size.trim());
      formData.append('weight', productForm.weight.trim());
      formData.append('dimensions', productForm.dimensions.trim());
      formData.append('highlight_1', productForm.highlight_1.trim());
      formData.append('highlight_2', productForm.highlight_2.trim());
      formData.append('highlight_3', productForm.highlight_3.trim());
      formData.append('highlight_4', productForm.highlight_4.trim());
      if (productForm.discount_percent !== '') {
        formData.append('discount_percent', productForm.discount_percent);
      }
      if (productForm.discount_starts_at) {
        formData.append('discount_starts_at', productForm.discount_starts_at);
      }
      if (productForm.discount_ends_at) {
        formData.append('discount_ends_at', productForm.discount_ends_at);
      }
      if (productForm.image_url.trim()) {
        formData.append('image_url', productForm.image_url.trim());
      }
      
      if (productForm.image) {
        formData.append('image', productForm.image);
      }

      const response = await api.post('/admin/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status === 'success') {
        // Success - close modal and refresh data
        alert('Product added successfully!');
        closeModals();
        resetForm();
        fetchAllData(); // Refresh the data
      } else {
        throw new Error(response.data.message || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      
      if (error.response?.data?.errors) {
        // Handle validation errors from backend
        setFormErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Failed to add product. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      stock_quantity: '',
      category_id: '',
      sku: '',
      color: '',
      material: '',
      brand: '',
      size: '',
      weight: '',
      dimensions: '',
      highlight_1: '',
      highlight_2: '',
      highlight_3: '',
      highlight_4: '',
      discount_percent: '',
      discount_starts_at: '',
      discount_ends_at: '',
      image_url: '',
      image: null
    });
    setFormErrors({});
    setImagePreview(null);
  };

  const handleDeleteProduct = async (id) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await api.delete(`/admin/products/${id}`);
        const nextPage =
          products.length === 1 && productsPagination.currentPage > 1
            ? productsPagination.currentPage - 1
            : productsPagination.currentPage;
        await fetchProducts({
          page: nextPage,
          perPage: productsPagination.perPage,
        });
        // Refresh dashboard stats
        fetchDashboardData();
        alert("Product deleted successfully");
      } catch (error) {
        console.error('Error deleting product:', error);
        alert(error.response?.data?.message || "Error deleting product");
      }
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (confirm("Are you sure you want to remove this customer?")) {
      try {
        await api.delete(`/admin/users/${id}`);
        // Remove from local state
        setCustomers(customers.filter((c) => c.id !== id));
        // Update stats
        setStats(prev => ({
          ...prev,
          totalCustomers: prev.totalCustomers - 1
        }));
        alert("Customer removed successfully");
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert(error.response?.data?.message || "Error removing customer");
      }
    }
  };

  const handleResendPendingUser = async (pendingUserId, email) => {
    const actionKey = `resend-${pendingUserId}`;
    setPendingActions((prev) => ({ ...prev, [actionKey]: true }));
    try {
      const response = await api.post(`/admin/pending-users/${pendingUserId}/resend`);
      if (response.data?.email_sent === false) {
        alert("Failed to send OTP email. Check mail settings.");
      } else {
        alert(`OTP resent to ${email}`);
      }
      if (response.data?.debug_otp) {
        alert(`Dev OTP: ${response.data.debug_otp}`);
      }
      await fetchPendingUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setPendingActions((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleDeletePendingUser = async (pendingUserId, email) => {
    if (!confirm(`Delete pending user ${email}?`)) {
      return;
    }
    const actionKey = `delete-${pendingUserId}`;
    setPendingActions((prev) => ({ ...prev, [actionKey]: true }));
    try {
      await api.delete(`/admin/pending-users/${pendingUserId}`);
      setPendingUsers((prev) => prev.filter((item) => item.id !== pendingUserId));
      alert("Pending user deleted successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete pending user.");
    } finally {
      setPendingActions((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleEditProduct = (product) => {
    handleOpenProduct(product.id);
  };

  const handleOpenProduct = (productId) => {
    navigate(`/admin_product_details/${productId}`);
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const apiStatus = mapStatusToApi(newStatus);
      const response = await api.patch(`/admin/orders/${orderId}/status`, { status: apiStatus });
      const updatedOrder = response.data?.order;
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          if (!updatedOrder) {
            return { ...order, status: newStatus };
          }
          const mappedStatus = mapOrderStatus(updatedOrder.status);
          const mappedPaymentStatus = mapPaymentStatus(updatedOrder.payment_status);
          const mappedPaymentMethod = mapPaymentMethod(updatedOrder.payment_method);
          const paymentNote =
            updatedOrder.payment_method === "COD" &&
            updatedOrder.status === "DELIVERED"
              ? "Paid on delivery"
              : "";
          return {
            ...order,
            status: mappedStatus,
            paymentStatus: mappedPaymentStatus,
            rawPaymentStatus: updatedOrder.payment_status,
            paymentMethod: mappedPaymentMethod,
            paymentNote,
          };
        })
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      alert(error.response?.data?.message || "Failed to update order status");
    }
  };

  const handleDeleteOrder = async (orderId, orderLabel) => {
    if (!confirm(`Delete ${orderLabel}? This cannot be undone.`)) {
      return;
    }

    setDeletingOrders((prev) => ({ ...prev, [orderId]: true }));
    try {
      await api.delete(`/admin/orders/${orderId}`);
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      fetchDashboardData();
      alert("Order deleted successfully");
    } catch (error) {
      console.error("Error deleting order:", error);
      alert(error.response?.data?.message || "Failed to delete order");
    } finally {
      setDeletingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const resetBulkProducts = () => {
    setBulkProducts([createEmptyBulkProduct()]);
    setBulkRowErrors({});
  };

  const normalizeBulkHeader = (header) =>
    String(header || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const resolveBulkCategoryId = (value, categoryList = categories) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return "";
    }
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
      return String(Math.trunc(numericValue));
    }
    const match = categoryList.find(
      (category) =>
        category.name &&
        category.name.toLowerCase() === String(value).trim().toLowerCase()
    );
    return match ? String(match.id) : "";
  };

  const toDateInputValue = (value) => {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    return String(value);
  };

  const mapBulkRow = (rawRow, categoryList = categories) => {
    const columnMap = {
      name: "name",
      productname: "name",
      category: "category_id",
      categoryid: "category_id",
      price: "price",
      stock: "stock_quantity",
      stockquantity: "stock_quantity",
      quantity: "stock_quantity",
      sku: "sku",
      color: "color",
      material: "material",
      brand: "brand",
      size: "size",
      weight: "weight",
      dimensions: "dimensions",
      discountpercent: "discount_percent",
      discount: "discount_percent",
      discountstart: "discount_starts_at",
      discountstartdate: "discount_starts_at",
      discountend: "discount_ends_at",
      discountenddate: "discount_ends_at",
      imageurl: "image_url",
      image: "image_url",
      description: "description",
      highlight1: "highlight_1",
      highlight2: "highlight_2",
      highlight3: "highlight_3",
      highlight4: "highlight_4",
    };

    const mapped = createEmptyBulkProduct();
    Object.entries(rawRow || {}).forEach(([key, value]) => {
      const normalized = normalizeBulkHeader(key);
      const field = columnMap[normalized];
      if (!field) return;
      if (field === "category_id") {
        mapped[field] = resolveBulkCategoryId(value, categoryList);
        return;
      }
      if (field === "discount_starts_at" || field === "discount_ends_at") {
        mapped[field] = toDateInputValue(value);
        return;
      }
      mapped[field] = value === null || value === undefined ? "" : String(value);
    });
    return mapped;
  };

  const normalizeBulkRow = (row) => {
    const cleaned = {};
    Object.entries(row).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }
      const trimmed = typeof value === "string" ? value.trim() : value;
      if (trimmed === "") {
        return;
      }
      cleaned[key] = trimmed;
    });
    return cleaned;
  };

  const validateBulkRows = (rows, categoryList = categories) => {
    const errors = {};
    const cleanedRows = [];

    rows.forEach((row, index) => {
      const hasValues = Object.values(row).some(
        (value) => String(value || "").trim() !== ""
      );
      if (!hasValues) {
        return;
      }

      const cleaned = normalizeBulkRow(row);
      const rowErrors = [];
      const name = cleaned.name || "";
      const categoryId = resolveBulkCategoryId(
        cleaned.category_id ?? "",
        categoryList
      );

      if (!name) {
        rowErrors.push("Name is required.");
      }
      if (!categoryId) {
        rowErrors.push("Category is required.");
      } else if (
        !categoryList.some((category) => String(category.id) === String(categoryId))
      ) {
        rowErrors.push("Category not found.");
      }

      const priceValue = cleaned.price;
      const priceNumber = Number(priceValue);
      if (priceValue === undefined || priceValue === "") {
        rowErrors.push("Price is required.");
      } else if (Number.isNaN(priceNumber) || priceNumber < 0) {
        rowErrors.push("Price must be 0 or greater.");
      }

      const stockValue = cleaned.stock_quantity;
      const stockNumber = Number(stockValue);
      if (stockValue === undefined || stockValue === "") {
        rowErrors.push("Stock is required.");
      } else if (
        Number.isNaN(stockNumber) ||
        !Number.isInteger(stockNumber) ||
        stockNumber < 0
      ) {
        rowErrors.push("Stock must be a whole number 0 or greater.");
      }

      if (cleaned.discount_percent !== undefined) {
        const percentNumber = Number(cleaned.discount_percent);
        if (Number.isNaN(percentNumber) || percentNumber < 0 || percentNumber > 100) {
          rowErrors.push("Discount percent must be between 0 and 100.");
        }
      }

      if (cleaned.image_url) {
        try {
          new URL(cleaned.image_url);
        } catch (error) {
          rowErrors.push("Image URL is invalid.");
        }
      }

      if (cleaned.discount_starts_at && cleaned.discount_ends_at) {
        if (cleaned.discount_ends_at < cleaned.discount_starts_at) {
          rowErrors.push("Discount end must be after start.");
        }
      }

      const normalizedRow = {
        ...cleaned,
        category_id: categoryId,
      };

      cleanedRows.push(normalizedRow);

      if (rowErrors.length) {
        errors[index] = rowErrors;
      }
    });

    return { errors, cleanedRows };
  };

  const handleBulkFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let categoryList = categories;
      if (!categoryList.length) {
        categoryList = await fetchCategories();
      }

      const fileName = file.name.toLowerCase();
      let workbook;

      if (fileName.endsWith(".csv")) {
        const text = await file.text();
        workbook = XLSX.read(text, { type: "string", cellDates: true });
      } else {
        const data = await file.arrayBuffer();
        workbook = XLSX.read(data, { type: "array", cellDates: true });
      }

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        alert("No sheet found in the file.");
        return;
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      });

      if (!rows.length) {
        alert("No rows found in the file.");
        return;
      }

      const mappedRows = rows
        .map((row) => mapBulkRow(row, categoryList))
        .filter((row) =>
          Object.values(row).some((value) => String(value || "").trim() !== "")
        );

      if (!mappedRows.length) {
        alert("No usable rows found in the file.");
        return;
      }

      setBulkProducts((prev) => {
        const prevHasValues = prev.some((row) =>
          Object.values(row).some((value) => String(value || "").trim() !== "")
        );
        const nextRows = prevHasValues ? [...prev, ...mappedRows] : mappedRows;
        const { errors } = validateBulkRows(nextRows, categoryList);
        setBulkRowErrors(errors);
        if (Object.keys(errors).length) {
          alert("Some rows need fixes. Review highlighted rows before saving.");
        }
        return nextRows;
      });
    } catch (error) {
      console.error("Error importing file:", error);
      alert("Failed to import the file. Please check the format.");
    } finally {
      event.target.value = "";
    }
  };

  const handleBulkRowChange = (index, field, value) => {
    setBulkProducts((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
    setBulkRowErrors((prev) => {
      if (!prev[index]) {
        return prev;
      }
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleAddBulkRow = () => {
    setBulkProducts((prev) => [...prev, createEmptyBulkProduct()]);
  };

  const handleRemoveBulkRow = (index) => {
    setBulkProducts((prev) =>
      prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : prev
    );
    setBulkRowErrors({});
  };

  const handleBulkSubmit = async () => {
    const { errors, cleanedRows } = validateBulkRows(bulkProducts);
    setBulkRowErrors(errors);
    if (Object.keys(errors).length) {
      alert("Fix validation errors before saving.");
      return;
    }

    const rowsWithValues = cleanedRows.filter((row) =>
      Object.values(row).some((value) => String(value || "").trim() !== "")
    );

    if (rowsWithValues.length === 0) {
      alert("Add at least one product row before submitting.");
      return;
    }

    setBulkSubmitting(true);
    try {
      await api.post('/admin/products/bulk', { products: rowsWithValues });
      alert("Products added successfully!");
      setShowBulkAdd(false);
      resetBulkProducts();
      fetchProducts({
        page: productsPagination.currentPage,
        perPage: productsPagination.perPage,
      });
      fetchDashboardData();
    } catch (error) {
      console.error("Error adding products in bulk:", error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors ||
        "Failed to add products.";
      alert(
        typeof message === "string"
          ? message
          : "Validation failed. Check the row values."
      );
    } finally {
      setBulkSubmitting(false);
    }
  };

  const closeModals = () => {
    setShowAddProduct(false);
    resetForm();
  };

  const closeBulkModal = () => {
    setShowBulkAdd(false);
    resetBulkProducts();
  };

  // Show loading spinner while checking admin access or loading data
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Show loading if authenticated but user data not loaded yet
  if (isAuthenticated && !user) {
    console.log("Showing loading: authenticated but no user data");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    console.log("Not rendering: not authenticated");
    return null;
  }

  // Don't render anything if user is not admin (will redirect)
  if (user && !isAdmin()) {
    console.log("Not rendering: user is not admin");
    return null;
  }

  // Only render if we have user data and user is admin
  if (!user || !isAdmin()) {
    console.log("Not rendering: waiting for user data or admin check");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Top Navigation */}
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  ShopMart Admin
                </h1>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={logout}
                className="px-4 py-2 text-gray-700 hover:text-green-600 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-screen">
          <nav className="p-4 space-y-2">
            {[
              {
                id: "dashboard",
                label: "Dashboard",
                icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
              },
              {
                id: "products",
                label: "Products",
                icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
              },
              {
                id: "orders",
                label: "Orders",
                icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
              },
              {
                id: "tracking",
                label: "Tracking",
                icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
              },
              {
                id: "customers",
                label: "Customers",
                icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
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
                    d={item.icon}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Dashboard Overview
              </h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  {
                    label: "Total Products",
                    value: stats.totalProducts,
                    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
                    color: "from-purple-500 to-purple-600",
                  },
                  {
                    label: "Total Customers",
                    value: stats.totalCustomers,
                    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                    color: "from-blue-500 to-blue-600",
                  },
                  {
                    label: "Total Orders",
                    value: stats.totalOrders,
                    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                    color: "from-green-500 to-green-600",
                  },
                  {
                    label: "Revenue",
                    value: stats.revenue,
                    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                    color: "from-orange-500 to-orange-600",
                  },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}
                      >
                        <svg
                          className="w-6 h-6 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d={stat.icon}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      handleTabChange("products");
                      setShowAddProduct(true);
                    }}
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-600 hover:bg-purple-50 transition-all"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-green-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M12 4v16m8-8H4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-900">
                      Add New Product
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabChange("customers")}
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-900">
                      View Customers
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabChange("products")}
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-600 hover:bg-green-50 transition-all"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-green-600"
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
                    </div>
                    <span className="font-semibold text-gray-900">
                      Manage Products
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === "products" && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Products Management
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M12 4v16m8-8H4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Add Product
                  </button>
                  <button
                    onClick={() => {
                      if (categories.length === 0) {
                        fetchCategories();
                      }
                      setShowBulkAdd(true);
                    }}
                    className="px-6 py-3 border border-emerald-200 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-50 transition-all flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M4 6h16M4 12h16M4 18h16"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Bulk Add
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Product
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Price
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Stock
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
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
                            <p className="text-lg font-medium">No products found</p>
                            <p className="text-sm">Add your first product to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr
                          key={product.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                                {product.image_url ? (
                                  <AdminProductImage
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg
                                      className="w-6 h-6 text-gray-400"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-gray-900">
                                  {product.name}
                                </span>
                                {product.description && (
                                  <div className="text-xs text-gray-500 truncate max-w-xs">
                                    {product.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {product.category?.name || 'No Category'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            ${parseFloat(product.price).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              product.stock_quantity > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {product.stock_quantity} in stock
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                product.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {product.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit product"
                              >
                                <svg
                                  className="w-5 h-5"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete product"
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
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                <div className="text-sm text-gray-600">
                  {productsLoading
                    ? "Loading products..."
                    : `Showing ${productsPagination.from || 0} to ${
                        productsPagination.to || 0
                      } of ${productsPagination.total || products.length} products`}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="text-sm text-gray-600 flex items-center gap-2">
                    Per page
                    <select
                      value={productsPagination.perPage}
                      onChange={handleProductsPerPageChange}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      {[10, 15, 25, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleProductsPageChange(
                          (productsPagination.currentPage || 1) - 1
                        )
                      }
                      disabled={
                        productsLoading || (productsPagination.currentPage || 1) <= 1
                      }
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {(() => {
                      const currentPage = productsPagination.currentPage || 1;
                      const lastPage = productsPagination.lastPage || 1;
                      const windowSize = 2;
                      const start = Math.max(1, currentPage - windowSize);
                      const end = Math.min(lastPage, currentPage + windowSize);
                      const pages = [];
                      for (let page = start; page <= end; page += 1) {
                        pages.push(page);
                      }
                      return pages.map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => handleProductsPageChange(page)}
                          disabled={productsLoading}
                          className={`px-3 py-1 text-sm border rounded-md ${
                            page === currentPage
                              ? "bg-green-600 text-white border-green-600"
                              : "border-gray-300 text-gray-700"
                          }`}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                    <button
                      type="button"
                      onClick={() =>
                        handleProductsPageChange(
                          (productsPagination.currentPage || 1) + 1
                        )
                      }
                      disabled={
                        productsLoading ||
                        (productsPagination.currentPage || 1) >=
                          (productsPagination.lastPage || 1)
                      }
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div>
              <h2 className="text-3xl font-extrabold text-emerald-900 drop-shadow-sm mb-8">
                Orders Management
              </h2>

              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-200 ring-2 ring-emerald-100"
                  >
                    {/* Order Header */}
                    <div className="p-6 bg-gradient-to-r from-emerald-100 via-lime-50 to-sky-100 border-b border-emerald-200">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-extrabold text-emerald-900">
                            {order.orderId}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Customer:{" "}
                            <span className="font-medium">
                              {order.customer}
                            </span>{" "}
                            ({order.customerEmail})
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Order Date
                            </div>
                            <div className="font-semibold text-slate-900">
                              {order.date}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs uppercase tracking-wide text-slate-500">Total</div>
                            <div className="text-lg font-extrabold text-emerald-700">
                              {order.total}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs uppercase tracking-wide text-slate-500">Payment</div>
                            <div className="text-sm font-semibold text-slate-900">
                              {order.paymentMethod}
                            </div>
                            <span
                              className={`inline-flex mt-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ring-2 ${
                                getPaymentBadgeClass(order.rawPaymentStatus)
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                            {order.paymentNote && (
                              <div className="mt-1 text-[11px] font-medium text-slate-500">
                                {order.paymentNote}
                              </div>
                            )}
                          </div>
                          <span
                            className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ring-2 ${
                              order.status === "Delivered"
                                ? "bg-emerald-200 text-emerald-900 ring-emerald-300"
                                : order.status === "Shipped"
                                ? "bg-sky-200 text-sky-900 ring-sky-300"
                                : order.status === "Pending"
                                ? "bg-amber-200 text-amber-900 ring-amber-300"
                                : "bg-rose-200 text-rose-900 ring-rose-300"
                            }`}
                          >
                            {order.status}
                          </span>
                          {order.status === "Cancelled" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteOrder(order.id, order.orderId)
                              }
                              disabled={Boolean(deletingOrders[order.id])}
                              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {deletingOrders[order.id] ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Products */}
                    <div className="p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">
                        Products Ordered:
                      </h4>
                      <div className="space-y-3">
                        {order.products.map((product, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-white via-emerald-50/70 to-sky-50/70 shadow-sm"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-emerald-200 to-sky-200 rounded-lg flex items-center justify-center overflow-hidden ring-2 ring-emerald-300">
                                {product.imageUrl ? (
                                  <AdminProductImage
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <svg
                                    className="w-6 h-6 text-green-600"
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
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {product.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Quantity: {product.quantity}
                                </div>
                              </div>
                            </div>
                            <div className="text-lg font-extrabold text-emerald-800">
                              {product.price}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tracking Tab */}
          {activeTab === "tracking" && (
            <div>
              <h2 className="text-3xl font-extrabold text-emerald-900 drop-shadow-sm mb-8">
                Order Tracking & Status Management
              </h2>

              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-200 ring-2 ring-emerald-100">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-emerald-100 via-lime-50 to-sky-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Order ID
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Payment
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Current Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Update Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-emerald-100/70 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-extrabold text-slate-900">
                          {order.orderId}
                        </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {order.customer}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.customerEmail}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {order.date}
                          </td>
                          <td className="px-6 py-4 text-sm font-extrabold text-emerald-800">
                            {order.total}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold shadow-sm ring-2 ${
                                getPaymentBadgeClass(order.rawPaymentStatus)
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                            {order.paymentNote && (
                              <div className="mt-1 text-[11px] font-medium text-slate-500">
                                {order.paymentNote}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold shadow-sm ring-2 ${
                                order.status === "Delivered"
                                  ? "bg-emerald-200 text-emerald-900 ring-emerald-300"
                                  : order.status === "Shipped"
                                  ? "bg-sky-200 text-sky-900 ring-sky-300"
                                  : order.status === "Processing"
                                  ? "bg-amber-200 text-amber-900 ring-amber-300"
                                  : order.status === "Pending"
                                  ? "bg-slate-200 text-slate-900 ring-slate-300"
                                  : "bg-rose-200 text-rose-900 ring-rose-300"
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleUpdateOrderStatus(order.id, e.target.value)
                              }
                              className="px-4 text-black py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none text-sm font-medium bg-emerald-50/40"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                        <td className="px-6 py-4">
                          {order.status === "Cancelled" ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteOrder(order.id, order.orderId)
                              }
                              disabled={Boolean(deletingOrders[order.id])}
                              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {deletingOrders[order.id] ? "Deleting..." : "Delete"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Status Legend */}
              <div className="mt-8 bg-white rounded-2xl shadow-xl p-6 border border-emerald-200 ring-2 ring-emerald-100">
                <h3 className="text-lg font-extrabold text-emerald-900 mb-4">
                  Status Guide
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    {
                      status: "Pending",
                      color: "bg-slate-200 text-slate-900 ring-2 ring-slate-300",
                      desc: "Order received, awaiting processing",
                    },
                    {
                      status: "Processing",
                      color: "bg-amber-200 text-amber-900 ring-2 ring-amber-300",
                      desc: "Order is being prepared",
                    },
                    {
                      status: "Shipped",
                      color: "bg-sky-200 text-sky-900 ring-2 ring-sky-300",
                      desc: "Order is in transit",
                    },
                    {
                      status: "Delivered",
                      color: "bg-emerald-200 text-emerald-900 ring-2 ring-emerald-300",
                      desc: "Order successfully delivered",
                    },
                    {
                      status: "Cancelled",
                      color: "bg-rose-200 text-rose-900 ring-2 ring-rose-300",
                      desc: "Order has been cancelled",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="p-4 border border-emerald-200 rounded-2xl bg-gradient-to-br from-white via-emerald-50 to-sky-50 shadow-sm"
                    >
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${item.color} mb-2`}
                      >
                        {item.status}
                      </span>
                      <p className="text-xs text-gray-600 mt-2">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === "customers" && (
            <div>
              <h2 className="text-3xl font-extrabold text-emerald-900 drop-shadow-sm mb-8">
                Customers
              </h2>

              <div className="mb-10 bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-200 ring-2 ring-emerald-100">
                <div className="px-6 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-100 via-lime-50 to-sky-100">
                  <h3 className="text-lg font-bold text-emerald-900">Pending Users</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                          Created
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                          Expires
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                          OTP Sent
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pendingUsersLoading ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-6 text-sm text-gray-500">
                            Loading pending users...
                          </td>
                        </tr>
                      ) : pendingUsers.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-6 text-sm text-gray-500">
                            No pending users.
                          </td>
                        </tr>
                      ) : (
                        pendingUsers.map((pending) => {
                          const statusLabel = pending.is_expired ? "Expired" : "Pending";
                          const statusClass = pending.is_expired
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700";
                          const resendKey = `resend-${pending.id}`;
                          const deleteKey = `delete-${pending.id}`;
                          const isResending = Boolean(pendingActions[resendKey]);
                          const isDeleting = Boolean(pendingActions[deleteKey]);

                          return (
                            <tr key={pending.id} className="hover:bg-emerald-100/70 transition-colors">
                              <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                {pending.name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {pending.email}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(pending.created_at)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(pending.expires_at, true)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {pending.last_sent_at
                                  ? `${formatDate(pending.last_sent_at, true)} (${pending.otp_count})`
                                  : "Not sent"}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleResendPendingUser(pending.id, pending.email)}
                                    disabled={pending.is_expired || isResending}
                                    className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {isResending ? "Sending..." : "Resend OTP"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePendingUser(pending.id, pending.email)}
                                    disabled={isDeleting}
                                    className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {isDeleting ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-200 ring-2 ring-emerald-100">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-emerald-100 via-lime-50 to-sky-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Orders
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Total Spent
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Joined
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-emerald-100/70 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-extrabold text-slate-900">
                          {customer.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {customer.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {customer.orders}
                        </td>
                        <td className="px-6 py-4 text-sm font-extrabold text-emerald-800">
                          {customer.spent}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {customer.joined}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bulk Add Products Modal */}
      {showBulkAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Bulk Add Products
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add multiple products in a spreadsheet-style table. Image upload is not supported here; use Image URL.
                </p>
              </div>
              <button
                onClick={closeBulkModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleAddBulkRow}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Add Row
                </button>
                <button
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Import CSV/XLSX
                </button>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleBulkFileImport}
                  className="hidden"
                />
                <span className="text-xs text-gray-500">
                  Required: Name, Category, Price, Stock.
                </span>
                <span className="text-xs text-amber-600">
                  Imports are local/admin-only. Avoid untrusted files.
                </span>
                {Object.keys(bulkRowErrors).length > 0 && (
                  <span className="text-xs text-rose-600">
                    {Object.keys(bulkRowErrors).length} row(s) need fixes.
                  </span>
                )}
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-[1800px] w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Name *</th>
                      <th className="px-4 py-3 text-left font-semibold">Category *</th>
                      <th className="px-4 py-3 text-left font-semibold">Price *</th>
                      <th className="px-4 py-3 text-left font-semibold">Stock *</th>
                      <th className="px-4 py-3 text-left font-semibold">SKU</th>
                      <th className="px-4 py-3 text-left font-semibold">Color</th>
                      <th className="px-4 py-3 text-left font-semibold">Material</th>
                      <th className="px-4 py-3 text-left font-semibold">Brand</th>
                      <th className="px-4 py-3 text-left font-semibold">Size</th>
                      <th className="px-4 py-3 text-left font-semibold">Weight</th>
                      <th className="px-4 py-3 text-left font-semibold">Dimensions</th>
                      <th className="px-4 py-3 text-left font-semibold">Discount %</th>
                      <th className="px-4 py-3 text-left font-semibold">Discount Start</th>
                      <th className="px-4 py-3 text-left font-semibold">Discount End</th>
                      <th className="px-4 py-3 text-left font-semibold">Image URL</th>
                      <th className="px-4 py-3 text-left font-semibold">Description</th>
                      <th className="px-4 py-3 text-left font-semibold">Highlight 1</th>
                      <th className="px-4 py-3 text-left font-semibold">Highlight 2</th>
                      <th className="px-4 py-3 text-left font-semibold">Highlight 3</th>
                      <th className="px-4 py-3 text-left font-semibold">Highlight 4</th>
                      <th className="px-4 py-3 text-left font-semibold">Errors</th>
                      <th className="px-4 py-3 text-left font-semibold">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bulkProducts.map((row, index) => (
                      <tr
                        key={index}
                        className={bulkRowErrors[index]?.length ? "bg-rose-50" : "bg-white"}
                      >
                        <td className="px-4 py-2">
                          <input
                            value={row.name}
                            onChange={(e) =>
                              handleBulkRowChange(index, "name", e.target.value)
                            }
                            className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Product name"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={row.category_id}
                            onChange={(e) =>
                              handleBulkRowChange(index, "category_id", e.target.value)
                            }
                            className="w-44 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          >
                            <option value="">Select</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.price}
                            onChange={(e) =>
                              handleBulkRowChange(index, "price", e.target.value)
                            }
                            className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            value={row.stock_quantity}
                            onChange={(e) =>
                              handleBulkRowChange(index, "stock_quantity", e.target.value)
                            }
                            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.sku}
                            onChange={(e) =>
                              handleBulkRowChange(index, "sku", e.target.value)
                            }
                            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="SKU"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.color}
                            onChange={(e) =>
                              handleBulkRowChange(index, "color", e.target.value)
                            }
                            className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Color"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.material}
                            onChange={(e) =>
                              handleBulkRowChange(index, "material", e.target.value)
                            }
                            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Material"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.brand}
                            onChange={(e) =>
                              handleBulkRowChange(index, "brand", e.target.value)
                            }
                            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Brand"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.size}
                            onChange={(e) =>
                              handleBulkRowChange(index, "size", e.target.value)
                            }
                            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Size"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.weight}
                            onChange={(e) =>
                              handleBulkRowChange(index, "weight", e.target.value)
                            }
                            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Weight"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.dimensions}
                            onChange={(e) =>
                              handleBulkRowChange(index, "dimensions", e.target.value)
                            }
                            className="w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Dimensions"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={row.discount_percent}
                            onChange={(e) =>
                              handleBulkRowChange(
                                index,
                                "discount_percent",
                                e.target.value
                              )
                            }
                            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={row.discount_starts_at}
                            onChange={(e) =>
                              handleBulkRowChange(
                                index,
                                "discount_starts_at",
                                e.target.value
                              )
                            }
                            className="w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={row.discount_ends_at}
                            onChange={(e) =>
                              handleBulkRowChange(
                                index,
                                "discount_ends_at",
                                e.target.value
                              )
                            }
                            className="w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.image_url}
                            onChange={(e) =>
                              handleBulkRowChange(index, "image_url", e.target.value)
                            }
                            className="w-56 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="https://..."
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.description}
                            onChange={(e) =>
                              handleBulkRowChange(index, "description", e.target.value)
                            }
                            className="w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.highlight_1}
                            onChange={(e) =>
                              handleBulkRowChange(index, "highlight_1", e.target.value)
                            }
                            className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Highlight 1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.highlight_2}
                            onChange={(e) =>
                              handleBulkRowChange(index, "highlight_2", e.target.value)
                            }
                            className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Highlight 2"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.highlight_3}
                            onChange={(e) =>
                              handleBulkRowChange(index, "highlight_3", e.target.value)
                            }
                            className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Highlight 3"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.highlight_4}
                            onChange={(e) =>
                              handleBulkRowChange(index, "highlight_4", e.target.value)
                            }
                            className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Highlight 4"
                          />
                        </td>
                        <td className="px-4 py-2 text-xs text-rose-600">
                          {bulkRowErrors[index]?.length
                            ? bulkRowErrors[index].length > 1
                              ? `${bulkRowErrors[index][0]} (+${bulkRowErrors[index].length - 1})`
                              : bulkRowErrors[index][0]
                            : "-"}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleRemoveBulkRow(index)}
                            className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
                            type="button"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t flex flex-wrap gap-3 justify-end">
              <button
                onClick={closeBulkModal}
                disabled={bulkSubmitting}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={bulkSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkSubmitting ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-2xl font-bold text-gray-900">
                Add New Product
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-600 transition-colors">
                  {imagePreview || productForm.image_url.trim() ? (
                    <div className="relative">
                      <AdminProductImage
                        src={imagePreview || productForm.image_url.trim()}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setProductForm((prev) => ({
                            ...prev,
                            image: null,
                            image_url: '',
                          }));
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M6 18L18 6M6 6l12 12"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg
                        className="w-12 h-12 text-gray-400 mx-auto mb-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-sm text-gray-600 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="add-product-image"
                  />
                  <label
                    htmlFor="add-product-image"
                    className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition-colors"
                  >
                    Choose File
                  </label>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or Image URL
                  </label>
                  <input
                    type="url"
                    value={productForm.image_url}
                    onChange={(e) => handleFormChange('image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full text-black px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Image file upload overrides the URL if both are provided.
                  </p>
                  {formErrors.image_url && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.image_url}</p>
                  )}
                </div>
                {formErrors.image && (
                  <p className="text-red-500 text-sm mt-2">{formErrors.image}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className={`w-full text-black px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter product name"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select 
                    value={productForm.category_id}
                    onChange={(e) => handleFormChange('category_id', e.target.value)}
                    className={`w-full text-black px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none ${
                      formErrors.category_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.category_id && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.category_id}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.price}
                    onChange={(e) => handleFormChange('price', e.target.value)}
                    className={`w-full text-black px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none ${
                      formErrors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {formErrors.price && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  value={productForm.stock_quantity}
                  onChange={(e) => handleFormChange('stock_quantity', e.target.value)}
                  className={`w-full text-black px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none ${
                    formErrors.stock_quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {formErrors.stock_quantity && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.stock_quantity}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Percent
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={productForm.discount_percent}
                    onChange={(e) => handleFormChange('discount_percent', e.target.value)}
                    className={`w-full text-black px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none ${
                      formErrors.discount_percent ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {formErrors.discount_percent && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.discount_percent}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Start
                  </label>
                  <input
                    type="date"
                    value={productForm.discount_starts_at}
                    onChange={(e) => handleFormChange('discount_starts_at', e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount End
                  </label>
                  <input
                    type="date"
                    value={productForm.discount_ends_at}
                    onChange={(e) => handleFormChange('discount_ends_at', e.target.value)}
                    className={`w-full text-black px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none ${
                      formErrors.discount_ends_at ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.discount_ends_at && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.discount_ends_at}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => handleFormChange('sku', e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="SKU (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => handleFormChange('brand', e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Brand (optional)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    value={productForm.color}
                    onChange={(e) => handleFormChange('color', e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Color (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material
                  </label>
                  <input
                    type="text"
                    value={productForm.material}
                    onChange={(e) => handleFormChange('material', e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Material (optional)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size
                  </label>
                  <input
                    type="text"
                    value={productForm.size}
                    onChange={(e) => handleFormChange('size', e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Size (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={productForm.weight}
                    onChange={(e) => handleFormChange('weight', e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Weight (optional)"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensions
                </label>
                <input
                  type="text"
                  value={productForm.dimensions}
                  onChange={(e) => handleFormChange('dimensions', e.target.value)}
                  className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                  placeholder="Dimensions (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows="4"
                  value={productForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                  placeholder="Enter product description (optional)"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Highlights
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={productForm.highlight_1}
                    onChange={(e) =>
                      handleFormChange('highlight_1', e.target.value)
                    }
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Highlight 1"
                  />
                  <input
                    type="text"
                    value={productForm.highlight_2}
                    onChange={(e) =>
                      handleFormChange('highlight_2', e.target.value)
                    }
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Highlight 2"
                  />
                  <input
                    type="text"
                    value={productForm.highlight_3}
                    onChange={(e) =>
                      handleFormChange('highlight_3', e.target.value)
                    }
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Highlight 3"
                  />
                  <input
                    type="text"
                    value={productForm.highlight_4}
                    onChange={(e) =>
                      handleFormChange('highlight_4', e.target.value)
                    }
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                    placeholder="Highlight 4"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={closeModals}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  'Add Product'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </>
  );
}

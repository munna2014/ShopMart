import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";
import AdminProductImage from "./AdminProductImage";

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon:
      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: "products",
    label: "Products",
    icon: "M20 12l-8-8-8 8M4 10v10a1 1 0 001 1h14a1 1 0 001-1V10",
  },
  {
    id: "orders",
    label: "Orders",
    icon:
      "M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2z",
  },
  {
    id: "tracking",
    label: "Tracking",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    id: "customers",
    label: "Customers",
    icon:
      "M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m0 0a5 5 0 10-3-9.58",
  },
];

export default function AdminProductDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { logout } = useAuth();

  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(true);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editDeleting, setEditDeleting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0 });

  const formatDateInput = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
      const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const apiBase = useMemo(() => {
    if (!api.defaults.baseURL) return "";
    return api.defaults.baseURL.replace(/\/api\/?$/, "");
  }, []);

  const fallbackImage = apiBase
    ? `${apiBase}/images/default-product.svg`
    : "/vite.svg";


  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        setProductLoading(true);
        const response = await api.get(`/admin/products/${id}`);
        setProduct(response.data.data || response.data || null);
      } catch (error) {
        console.error("Failed to load product:", error);
        setProduct(null);
      } finally {
        setProductLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories");
        setCategories(response.data.categories || []);
      } catch (error) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const response = await api.get(`/products/${id}/reviews`);
        setReviews(response.data.reviews || []);
        setReviewSummary({
          average: response.data.average_rating || 0,
          count: response.data.review_count || 0,
        });
      } catch (error) {
        setReviews([]);
        setReviewSummary({ average: 0, count: 0 });
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    setEditForm({
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      price: product.price ?? "",
      stock_quantity: product.stock_quantity ?? "",
      category_id: product.category_id || product.category?.id || "",
      is_active: Boolean(product.is_active),
      color: product.color || "",
      material: product.material || "",
      brand: product.brand || "",
      size: product.size || "",
      weight: product.weight || "",
      dimensions: product.dimensions || "",
      highlight_1: product.highlight_1 || "",
      highlight_2: product.highlight_2 || "",
      highlight_3: product.highlight_3 || "",
      highlight_4: product.highlight_4 || "",
      discount_percent: product.discount_percent ?? "",
      discount_starts_at: formatDateInput(product.discount_starts_at),
      discount_ends_at: formatDateInput(product.discount_ends_at),
      image_url: product.image_url || "",
      image: null,
    });
  }, [product]);

  const priceLabel = useMemo(() => {
    if (!product) return "$0.00";
    const rawPrice = Number(product.price || 0);
    if (Number.isNaN(rawPrice)) return product.price || "$0.00";
    return `$${rawPrice.toFixed(2)}`;
  }, [product]);

  const stockCount = useMemo(() => {
    if (!product) return 0;
    return Number(product.stock_quantity ?? product.stock ?? 0);
  }, [product]);

  const imageDescriptionLines = useMemo(() => {
    if (!product) return ["Product image."];
    const categoryName = product.category?.name || "Uncategorized";
    const description = product.description
      ? product.description.trim()
      : "No description available.";
    const details = [];
    if (product.color) details.push(`Color: ${product.color}`);
    if (product.material) details.push(`Material: ${product.material}`);
    if (product.size) details.push(`Size: ${product.size}`);
    if (product.brand) details.push(`Brand: ${product.brand}`);
    if (product.weight) details.push(`Weight: ${product.weight}`);
    if (product.dimensions) details.push(`Dimensions: ${product.dimensions}`);

    const lines = [
      `${product.name} in ${categoryName}.`,
      description,
      `Price: ${priceLabel}. Availability: ${
        stockCount > 0 ? `${stockCount} in stock` : "Out of stock"
      }.`,
    ];

    if (details.length > 0) {
      lines.push(`Details: ${details.join(", ")}.`);
    }

    return lines;
  }, [product, priceLabel, stockCount]);

  const imageDescriptionText = imageDescriptionLines.join(" ");

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setEditForm((prev) => ({ ...prev, image: file }));
  };

  const handleSaveProduct = async () => {
    if (!editForm) return;
    setEditSaving(true);
    try {
      if (editForm.image) {
        const formData = new FormData();
        formData.append("name", editForm.name.trim());
        formData.append("sku", editForm.sku.trim());
        formData.append("description", editForm.description.trim());
        formData.append("price", editForm.price);
        formData.append("stock_quantity", editForm.stock_quantity);
        formData.append("category_id", editForm.category_id);
        formData.append("is_active", editForm.is_active ? "1" : "0");
        formData.append("color", editForm.color.trim());
        formData.append("material", editForm.material.trim());
        formData.append("brand", editForm.brand.trim());
        formData.append("size", editForm.size.trim());
        formData.append("weight", editForm.weight.trim());
        formData.append("dimensions", editForm.dimensions.trim());
        formData.append("highlight_1", editForm.highlight_1.trim());
        formData.append("highlight_2", editForm.highlight_2.trim());
        formData.append("highlight_3", editForm.highlight_3.trim());
        formData.append("highlight_4", editForm.highlight_4.trim());
        if (editForm.discount_percent !== "") {
          formData.append("discount_percent", editForm.discount_percent);
        }
        if (editForm.discount_starts_at) {
          formData.append("discount_starts_at", editForm.discount_starts_at);
        }
        if (editForm.discount_ends_at) {
          formData.append("discount_ends_at", editForm.discount_ends_at);
        }
        formData.append("image", editForm.image);
        await api.post(`/admin/products/${id}?_method=PUT`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const payload = {
          name: editForm.name.trim(),
          sku: editForm.sku.trim(),
          description: editForm.description.trim(),
          price: parseFloat(editForm.price),
          stock_quantity: parseInt(editForm.stock_quantity, 10),
          category_id: editForm.category_id,
          is_active: editForm.is_active,
          color: editForm.color.trim(),
          material: editForm.material.trim(),
          brand: editForm.brand.trim(),
          size: editForm.size.trim(),
          weight: editForm.weight.trim(),
          dimensions: editForm.dimensions.trim(),
          highlight_1: editForm.highlight_1.trim(),
          highlight_2: editForm.highlight_2.trim(),
          highlight_3: editForm.highlight_3.trim(),
          highlight_4: editForm.highlight_4.trim(),
          discount_percent:
            editForm.discount_percent === ""
              ? null
              : Number(editForm.discount_percent),
          discount_starts_at: editForm.discount_starts_at || null,
          discount_ends_at: editForm.discount_ends_at || null,
        };

        if (editForm.image_url.trim()) {
          payload.image_url = editForm.image_url.trim();
        }

        await api.put(`/admin/products/${id}`, payload);
      }

      const refreshed = await api.get(`/admin/products/${id}`);
      setProduct(refreshed.data.data || refreshed.data || null);
      alert("Product updated successfully.");
    } catch (error) {
      console.error("Failed to update product:", error);
      alert(error.response?.data?.message || "Failed to update product.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirm("Delete this product? This cannot be undone.")) {
      return;
    }

    setEditDeleting(true);
    try {
      await api.delete(`/admin/products/${id}`);
      alert("Product deleted.");
      navigate("/?tab=products");
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert(error.response?.data?.message || "Failed to delete product.");
    } finally {
      setEditDeleting(false);
    }
  };

  const handleAdminLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleBack = () => {
    navigate("/?tab=products");
  };

  const handleTabNavigate = (tabId) => {
    if (tabId === "dashboard") {
      navigate("/");
    } else {
      navigate(`/?tab=${tabId}`);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("Delete this review?")) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      const response = await api.get(`/products/${id}/reviews`);
      setReviews(response.data.reviews || []);
      setReviewSummary({
        average: response.data.average_rating || 0,
        count: response.data.review_count || 0,
      });
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete review.");
    }
  };

  const renderStars = (value) =>
    Array.from({ length: 5 }).map((_, index) => (
      <span
        key={`star-${value}-${index}`}
        className={index < value ? "text-yellow-500" : "text-gray-300"}
      >
        ★
      </span>
    ));

  return (
    <>
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 rounded-xl flex items-center justify-center">
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
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg
                  className="w-6 h-6 text-gray-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={handleAdminLogout}
                className="px-4 py-2 text-gray-700 hover:text-green-600 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white border-r min-h-screen">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = item.id === "products";
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white shadow-lg"
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
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
            {productLoading ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-2xl"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-12 bg-gray-200 rounded w-1/2"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ) : !product ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Product not found
            </h1>
            <p className="text-gray-600 mb-6">
              This product may no longer be available.
            </p>
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Back to Products
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Main Product Card - 2 Column Layout */}
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Image Section - Bigger with Zoom */}
                <div className="p-4 lg:border-r border-gray-100">
                  <div className="relative overflow-hidden rounded-lg bg-gray-50 group cursor-zoom-in">
                    <AdminProductImage
                      src={product.image_url || product.image}
                      alt={imageDescriptionText}
                      className="w-full h-[350px] lg:h-[450px] object-contain transition-transform duration-300 group-hover:scale-150"
                    />
                  </div>
                </div>

                {/* Product Info Section */}
                <div className="p-4">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">
                    {product.category?.name || "Uncategorized"}
                  </p>
                  <h1 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{product.name}</h1>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                    <div className="flex text-sm">{renderStars(Math.round(reviewSummary.average || 0))}</div>
                    <span className="text-xs text-gray-500">{reviewSummary.average.toFixed(1)} ({reviewSummary.count} reviews)</span>
                  </div>

                  {/* Color & Size Options */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Color</p>
                      <div className="flex flex-wrap gap-1">
                        {(product.color || "Default").split(",").map((color) => (
                          <span key={color.trim()} className="px-2 py-1 rounded border border-gray-200 text-xs text-gray-700 bg-gray-50">
                            {color.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Size</p>
                      <div className="flex flex-wrap gap-1">
                        {(product.size || "Standard").split(",").map((size) => (
                          <span key={size.trim()} className="px-2 py-1 rounded border border-gray-200 text-xs text-gray-700 bg-gray-50">
                            {size.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="bg-blue-50 rounded-lg p-2.5 mb-3">
                    <p className="text-xs font-semibold text-blue-800">🚚 Estimated delivery: Aug 12-14</p>
                    <p className="text-xs text-blue-600">Shipping: free</p>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{product.description || "No description available."}</p>
                  </div>

                  {/* Price & Stock */}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900">${priceLabel}</span>
                    </div>
                    <p className={`text-sm font-medium ${stockCount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {stockCount > 0 ? `In Stock (${stockCount})` : "Out of Stock"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details, Highlights & Reviews - 3 columns */}
            <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
              <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] md:gap-x-6">
                {/* Product Details */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">Product Details</h2>
                  <table className="text-xs">
                    <tbody>
                      <tr><td className="py-0.5 text-gray-500 pr-3">Product Type</td><td className="py-0.5 text-gray-800">{product.category?.name || "Uncategorized"}</td></tr>
                      <tr><td className="py-0.5 text-gray-500 pr-3">Brand</td><td className="py-0.5 text-gray-800">{product.brand || "Not specified"}</td></tr>
                      <tr><td className="py-0.5 text-gray-500 pr-3">Color</td><td className="py-0.5 text-gray-800">{product.color || "Not specified"}</td></tr>
                      <tr><td className="py-0.5 text-gray-500 pr-3">Material</td><td className="py-0.5 text-gray-800">{product.material || "Not specified"}</td></tr>
                      <tr><td className="py-0.5 text-gray-500 pr-3">Size</td><td className="py-0.5 text-gray-800">{product.size || "Not specified"}</td></tr>
                      <tr><td className="py-0.5 text-gray-500 pr-3">Weight</td><td className="py-0.5 text-gray-800">{product.weight || "Not specified"}</td></tr>
                      <tr><td className="py-0.5 text-gray-500 pr-3">Dimensions</td><td className="py-0.5 text-gray-800">{product.dimensions || "Not specified"}</td></tr>
                      <tr><td className="py-0.5 text-gray-500 pr-3">SKU</td><td className="py-0.5 text-gray-800">{product.sku || "Not specified"}</td></tr>
                      <tr><td className="py-0.5 text-gray-500 pr-3">Availability</td><td className="py-0.5 text-gray-800">{stockCount > 0 ? `${stockCount} in stock` : "Out of stock"}</td></tr>
                    </tbody>
                  </table>
                </div>
                {/* Highlights */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">Highlights</h2>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li className="flex gap-1.5"><span className="text-green-500">✓</span>{product.highlight_1 || "Quality build for everyday use"}</li>
                    <li className="flex gap-1.5"><span className="text-green-500">✓</span>{product.highlight_2 || "Comfortable, reliable, and durable"}</li>
                    <li className="flex gap-1.5"><span className="text-green-500">✓</span>{product.highlight_3 || "Designed to fit modern lifestyles"}</li>
                    <li className="flex gap-1.5"><span className="text-green-500">✓</span>{product.highlight_4 || "Popular choice in this category"}</li>
                  </ul>
                </div>
                {/* Reviews Summary */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">Reviews</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="flex">{renderStars(Math.round(reviewSummary.average || 0))}</div>
                    <span>{reviewSummary.average.toFixed(1)} ({reviewSummary.count} reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Edit Form */}
            {editForm ? (
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Edit</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Product Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImage}
                      className="w-full text-sm"
                    />
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Or Image URL
                      </label>
                      <input
                        type="url"
                        value={editForm.image_url}
                        onChange={(e) =>
                          handleEditChange("image_url", e.target.value)
                        }
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        File upload overrides the URL if both are provided.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleEditChange("name", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={editForm.sku}
                      onChange={(e) => handleEditChange("sku", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => handleEditChange("price", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.stock_quantity}
                      onChange={(e) =>
                        handleEditChange("stock_quantity", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Discount Percent
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={editForm.discount_percent}
                      onChange={(e) =>
                        handleEditChange("discount_percent", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Discount Start
                    </label>
                    <input
                      type="date"
                      value={editForm.discount_starts_at}
                      onChange={(e) =>
                        handleEditChange("discount_starts_at", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Discount End
                    </label>
                    <input
                      type="date"
                      value={editForm.discount_ends_at}
                      onChange={(e) =>
                        handleEditChange("discount_ends_at", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={editForm.category_id}
                      onChange={(e) =>
                        handleEditChange("category_id", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Color
                    </label>
                    <input
                      type="text"
                      value={editForm.color}
                      onChange={(e) => handleEditChange("color", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Material
                    </label>
                    <input
                      type="text"
                      value={editForm.material}
                      onChange={(e) =>
                        handleEditChange("material", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={editForm.brand}
                      onChange={(e) => handleEditChange("brand", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Size
                    </label>
                    <input
                      type="text"
                      value={editForm.size}
                      onChange={(e) => handleEditChange("size", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Weight
                    </label>
                    <input
                      type="text"
                      value={editForm.weight}
                      onChange={(e) => handleEditChange("weight", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dimensions
                    </label>
                    <input
                      type="text"
                      value={editForm.dimensions}
                      onChange={(e) =>
                        handleEditChange("dimensions", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows="4"
                      value={editForm.description}
                      onChange={(e) =>
                        handleEditChange("description", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Highlight 1
                    </label>
                    <input
                      type="text"
                      value={editForm.highlight_1}
                      onChange={(e) =>
                        handleEditChange("highlight_1", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Highlight 2
                    </label>
                    <input
                      type="text"
                      value={editForm.highlight_2}
                      onChange={(e) =>
                        handleEditChange("highlight_2", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Highlight 3
                    </label>
                    <input
                      type="text"
                      value={editForm.highlight_3}
                      onChange={(e) =>
                        handleEditChange("highlight_3", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Highlight 4
                    </label>
                    <input
                      type="text"
                      value={editForm.highlight_4}
                      onChange={(e) =>
                        handleEditChange("highlight_4", e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) =>
                        handleEditChange("is_active", e.target.checked)
                      }
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Active
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSaveProduct}
                    disabled={editSaving}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 text-sm"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={handleDeleteProduct}
                    disabled={editDeleting}
                    className="px-6 py-2 border border-red-200 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors disabled:opacity-60 text-sm"
                  >
                    {editDeleting ? "Deleting..." : "Delete Product"}
                  </button>
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm"
                  >
                    ← Back to Products
                  </button>
                </div>
              </div>
            ) : null}

            {/* Customer Reviews List */}
            <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Customer Reviews</h2>
              {reviewsLoading ? (
                <p className="text-xs text-gray-500 text-center py-2">Loading...</p>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">No reviews yet.</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((review) => (
                    <div key={review.id} className="border border-gray-100 rounded-lg p-3 flex justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">{review.user?.full_name || "Customer"}</span>
                          <span className="flex text-yellow-500">{renderStars(review.rating)}</span>
                          <span className="text-xs text-gray-400">{review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}</span>
                        </div>
                        {review.title && <p className="text-sm font-medium text-gray-800 mb-0.5">{review.title}</p>}
                        <p className="text-sm text-gray-600">{review.body}</p>
                      </div>
                      {review.can_delete && (
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-xs text-red-600 hover:underline ml-4"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        </main>
      </div>
    </>
  );
}

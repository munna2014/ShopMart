"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import { getPricing } from "@/lib/pricing";

export default function ProductDetailsPage({ params }) {
  const router = useRouter();
  const routeParams = useParams();
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const productId = routeParams?.id;

  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0 });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    body: "",
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewEditingId, setReviewEditingId] = useState(null);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=/components/customer/productDetails/${productId}`);
    } else if (isAdmin()) {
      router.replace("/components/admin");
    }
  }, [loading, isAuthenticated, isAdmin, router, productId]);

  useEffect(() => {
    if (!isAuthenticated || !productId) return;
    const fetchProduct = async () => {
      try {
        setProductLoading(true);
        const response = await api.get(`/products/${productId}`);
        setProduct(response.data.data || null);
      } catch (error) {
        console.error("Failed to load product:", error);
        setProduct(null);
      } finally {
        setProductLoading(false);
      }
    };

    fetchProduct();
  }, [isAuthenticated, productId]);

  useEffect(() => {
    if (!productId) return;
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const response = await api.get(`/products/${productId}/reviews`);
        setReviews(response.data.reviews || []);
        setReviewSummary({
          average: response.data.average_rating || 0,
          count: response.data.review_count || 0,
        });
      } catch (error) {
        console.error("Failed to load reviews:", error);
        setReviews([]);
        setReviewSummary({ average: 0, count: 0 });
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [productId, isAuthenticated]);

  const pricing = useMemo(() => {
    if (!product) {
      return { basePrice: 0, discountedPrice: 0, discountPercent: 0, discountActive: false };
    }
    return getPricing(product);
  }, [product]);

  const priceLabel = useMemo(() => {
    if (!product) return "$0.00";
    return `$${pricing.discountedPrice.toFixed(2)}`;
  }, [product, pricing]);

  const originalPriceLabel = useMemo(() => {
    if (!product) return "$0.00";
    return `$${pricing.basePrice.toFixed(2)}`;
  }, [product, pricing]);

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

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/components/customer/productDetails/${productId}`);
      return;
    }

    if (stockCount <= 0 || !product) {
      return;
    }

    setAddingToCart(true);
    try {
      await api.post("/cart/items", { product_id: product.id, quantity: 1 });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert(error.response?.data?.message || "Failed to add item to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  const resetReviewForm = () => {
    setReviewForm({ rating: 5, title: "", body: "" });
    setReviewEditingId(null);
    setReviewError("");
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!reviewForm.body.trim()) {
      setReviewError("Please write a review before submitting.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");
    try {
      if (reviewEditingId) {
        await api.put(`/reviews/${reviewEditingId}`, {
          rating: Number(reviewForm.rating),
          title: reviewForm.title.trim() || null,
          body: reviewForm.body.trim(),
        });
      } else {
        await api.post(`/products/${productId}/reviews`, {
          rating: Number(reviewForm.rating),
          title: reviewForm.title.trim() || null,
          body: reviewForm.body.trim(),
        });
      }

      const response = await api.get(`/products/${productId}/reviews`);
      setReviews(response.data.reviews || []);
      setReviewSummary({
        average: response.data.average_rating || 0,
        count: response.data.review_count || 0,
      });
      resetReviewForm();
    } catch (error) {
      setReviewError(
        error.response?.data?.message || "Failed to save review."
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleEditReview = (review) => {
    setReviewForm({
      rating: review.rating,
      title: review.title || "",
      body: review.body || "",
    });
    setReviewEditingId(review.id);
    setReviewError("");
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("Delete this review?")) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      const response = await api.get(`/products/${productId}/reviews`);
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
        *
      </span>
    ));

  if (!isAuthenticated && !loading) {
    return null;
  }

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
              href="/components/customer?tab=shop"
              className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
        {productLoading ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8 animate-pulse">
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
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Product not found
            </h1>
            <p className="text-gray-600 mb-6">
              This product may no longer be available.
            </p>
            <Link
              href="/components/customer?tab=shop"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Back to Products
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
              <div className="relative">
                <img
                  src={product.image_url || product.image || "/images/default-product.svg"}
                  alt={imageDescriptionText}
                  className="w-full aspect-square object-cover rounded-2xl border border-gray-100"
                  onError={(e) => {
                    e.target.src = "/images/default-product.svg";
                  }}
                />
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Product details of {product.name}
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 md:text-right">
                      Highlights
                    </h3>
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
                      <li>Product Type: {product.category?.name || "Uncategorized"}</li>
                      <li>Color: {product.color || "Not specified"}</li>
                      <li>Main Material: {product.material || "Not specified"}</li>
                      <li>Brand: {product.brand || "Not specified"}</li>
                      <li>Size: {product.size || "Not specified"}</li>
                      <li>Weight: {product.weight || "Not specified"}</li>
                      <li>Dimensions: {product.dimensions || "Not specified"}</li>
                      <li>Availability: {stockCount > 0 ? `${stockCount} in stock` : "Out of stock"}</li>
                    </ul>
                    <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside pl-0 md:justify-self-end">
                      <li>{product.highlight_1 || "Quality build for everyday use"}</li>
                      <li>{product.highlight_2 || "Comfortable, reliable, and durable"}</li>
                      <li>{product.highlight_3 || "Designed to fit modern lifestyles"}</li>
                      <li>{product.highlight_4 || "Popular choice in this category"}</li>
                    </ul>
                  </div>

                <div className="mt-6 border-t border-gray-200 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                      <span className="font-semibold text-gray-900">Brand</span>
                      <div>{product.brand || "No brand"}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">SKU</span>
                      <div>{product.sku || "Not specified"}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-green-600 font-semibold uppercase tracking-wide mb-2">
                  {product.category?.name || "Uncategorized"}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                  {product.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {priceLabel}
                  </span>
                  {pricing.discountActive &&
                  pricing.basePrice > pricing.discountedPrice ? (
                    <span className="text-sm text-gray-500 line-through">
                      {originalPriceLabel}
                    </span>
                  ) : null}
                  {pricing.discountActive &&
                  pricing.basePrice > pricing.discountedPrice ? (
                    <span className="text-xs font-semibold text-rose-600">
                      -{pricing.discountPercent}%
                    </span>
                  ) : null}
                  <span className="text-sm text-gray-600">
                    {stockCount > 0 ? `${stockCount} in stock` : "Out of stock"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Color
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(product.color || "Default").split(",").map((color) => (
                        <span
                          key={color.trim()}
                          className="px-3 py-1 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50"
                        >
                          {color.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Size
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(product.size || "Standard").split(",").map((size) => (
                        <span
                          key={size.trim()}
                          className="px-3 py-1 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50"
                        >
                          {size.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Delivery
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    Estimated delivery: Aug 12-14
                  </p>
                  <p className="text-sm text-gray-600">Shipping: $4.99</p>
                </div>

              </div>
            </div>
            <div className="mt-10 border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Description
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {product.description || "No description available."}
              </p>
            </div>
            <div className="mt-10 border-t border-gray-200 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Reviews
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <div className="flex">
                      {renderStars(Math.round(reviewSummary.average || 0))}
                    </div>
                    <span>
                      {reviewSummary.average.toFixed(1)} ({reviewSummary.count})
                    </span>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleReviewSubmit}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rating
                    </label>
                    <select
                      value={reviewForm.rating}
                      onChange={(e) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          rating: Number(e.target.value),
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>
                          {value} Star{value > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={reviewForm.title}
                      onChange={(e) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                      placeholder="Great product"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Review
                    </label>
                    <textarea
                      rows="4"
                      value={reviewForm.body}
                      onChange={(e) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                      placeholder="Share details about your experience"
                    />
                  </div>
                </div>
                {reviewError ? (
                  <p className="text-sm text-red-600 mt-3">{reviewError}</p>
                ) : null}
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    {reviewSubmitting
                      ? "Saving..."
                      : reviewEditingId
                      ? "Update Review"
                      : "Submit Review"}
                  </button>
                  {reviewEditingId ? (
                    <button
                      type="button"
                      onClick={resetReviewForm}
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </form>

              {reviewsLoading ? (
                <div className="text-sm text-gray-500">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No reviews yet. Be the first to review this product.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">
                              {review.user?.full_name || "Customer"}
                            </span>
                            <span>-</span>
                            <span>
                              {review.created_at
                                ? new Date(review.created_at).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "2-digit",
                                      year: "numeric",
                                    }
                                  )
                                : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm text-gray-600">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {review.can_edit ? (
                            <button
                              onClick={() => handleEditReview(review)}
                              className="px-3 py-1.5 text-sm font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                            >
                              Edit
                            </button>
                          ) : null}
                          {review.can_delete ? (
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="px-3 py-1.5 text-sm font-semibold text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {review.title ? (
                        <h3 className="text-sm font-semibold text-gray-900 mt-3">
                          {review.title}
                        </h3>
                      ) : null}
                      <p className="text-sm text-gray-600 mt-2">
                        {review.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                disabled={stockCount <= 0 || addingToCart}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                  stockCount > 0 && !addingToCart
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {stockCount > 0
                  ? addingToCart
                    ? "Adding..."
                    : addedToCart
                    ? "Added"
                    : "Add to Cart"
                  : "Out of Stock"}
              </button>
              <Link
                href="/components/customer?tab=shop"
                className="flex-1 px-6 py-3 border border-green-200 text-green-700 rounded-xl font-semibold text-center hover:bg-green-50 transition-all"
              >
                Back to Products
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

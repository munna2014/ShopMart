"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import { addGuestItem } from "@/lib/guestCart";
import { getPricing } from "@/lib/pricing";
import DiscountCountdown from "@/components/DiscountCountdown";
import ProductImage from "@/components/ProductImage";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

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
    if (!id) return;
    const fetchProduct = async () => {
      try {
        setProductLoading(true);
        const response = await api.get(`/products/${id}`);
        setProduct(response.data.data || null);
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
        console.error("Failed to load reviews:", error);
        setReviews([]);
        setReviewSummary({ average: 0, count: 0 });
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [id, isAuthenticated]);

  const pricing = useMemo(() => {
    if (!product) {
      return { basePrice: 0, discountedPrice: 0, discountPercent: 0, discountActive: false };
    }
    return getPricing(product);
  }, [product]);

  const priceLabel = useMemo(() => {
    if (!product) return "$0.00";
    return `${pricing.discountedPrice.toFixed(2)}`;
  }, [product, pricing]);

  const originalPriceLabel = useMemo(() => {
    if (!product) return "$0.00";
    return `${pricing.basePrice.toFixed(2)}`;
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
    if (stockCount <= 0 || !product) {
      return;
    }

    setAddingToCart(true);
    try {
      if (!isAuthenticated) {
        addGuestItem(
          {
            id: product.id,
            name: product.name,
            price: pricing.discountedPrice,
            image: product.image_url || product.image,
          },
          1
        );
      } else {
        await api.post("/cart/items", { product_id: product.id, quantity: 1 });
      }
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
    if (!isAuthenticated) {
      setReviewError("Please sign in to leave a review.");
      return;
    }

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
        await api.post(`/products/${id}/reviews`, {
          rating: Number(reviewForm.rating),
          title: reviewForm.title.trim() || null,
          body: reviewForm.body.trim(),
        });
      }

      const response = await api.get(`/products/${id}/reviews`);
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

  const backLink = "/products";

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Compact Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-12">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6V20c0 1.1.9 2 2 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-base font-bold text-green-600">ShopMart</span>
            </Link>
            <Link href={backLink} className="text-sm text-green-600 hover:text-green-700 font-medium">
              ← Back
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 pt-14 pb-6">
        {productLoading ? (
          <div className="bg-white rounded-lg p-4 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 h-72 bg-gray-200 rounded-lg"></div>
              <div className="lg:col-span-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="lg:col-span-3 h-40 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ) : !product ? (
          <div className="bg-white rounded-lg p-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Product not found</h1>
            <p className="text-gray-600 mb-4 text-sm">This product may no longer be available.</p>
            <Link href={backLink} className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
              Back to Products
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Main Product Card */}
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Image Section - Bigger */}
                <div className="p-4 lg:border-r border-gray-100">
                  <div className="relative overflow-hidden rounded-lg bg-gray-50 group cursor-zoom-in">
                    <ProductImage
                      src={product.image_url || product.image}
                      alt={imageDescriptionText}
                      className="w-full h-[350px] lg:h-[450px] object-contain transition-transform duration-300 group-hover:scale-150"
                    />
                  </div>
                  {/* Mobile Action Buttons */}
                  <div className="flex gap-2 mt-3 lg:hidden">
                    <button
                      onClick={handleAddToCart}
                      disabled={stockCount <= 0 || addingToCart}
                      className={`flex-1 py-2.5 rounded-lg font-semibold text-sm ${
                        stockCount > 0 && !addingToCart
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {stockCount > 0 ? (addingToCart ? "Adding..." : addedToCart ? "✓ Added" : "Add to Cart") : "Out of Stock"}
                    </button>
                    <Link href={backLink} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm text-center">
                      Back
                    </Link>
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
                          <span key={color.trim()} className="px-2 py-1 rounded border border-gray-200 text-xs text-gray-700 bg-gray-50 hover:border-green-400 cursor-pointer">
                            {color.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Size</p>
                      <div className="flex flex-wrap gap-1">
                        {(product.size || "Standard").split(",").map((size) => (
                          <span key={size.trim()} className="px-2 py-1 rounded border border-gray-200 text-xs text-gray-700 bg-gray-50 hover:border-green-400 cursor-pointer">
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

                  {/* Price & Add to Cart */}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900">${priceLabel}</span>
                      {pricing.discountActive && pricing.basePrice > pricing.discountedPrice && (
                        <>
                          <span className="text-sm text-gray-400 line-through">${originalPriceLabel}</span>
                          <span className="text-xs font-semibold text-red-500">-{pricing.discountPercent}%</span>
                        </>
                      )}
                    </div>
                    {pricing.discountActive && product.discount_ends_at && (
                      <DiscountCountdown endDate={product.discount_ends_at} />
                    )}
                    <p className={`text-sm font-medium ${stockCount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {stockCount > 0 ? `In Stock (${stockCount})` : "Out of Stock"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddToCart}
                        disabled={stockCount <= 0 || addingToCart}
                        className={`px-4 py-1.5 rounded-lg font-medium text-sm ${
                          stockCount > 0 && !addingToCart
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {stockCount > 0 ? (addingToCart ? "Adding..." : addedToCart ? "✓ Added" : "Add to Cart") : "Out of Stock"}
                      </button>
                      <Link href={backLink} className="px-4 py-1.5 rounded-lg font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">
                        ← Back to Products
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details, Highlights & Reviews - 3 columns */}
            <div className="bg-white rounded-lg px-3 py-2">
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
                <div className="ml-10">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">Highlights</h2>
                  <ul className="text-xs text-gray-700 space-y-3">
                    <li className="flex gap-1.5"><span className="text-green-500">✓</span>{product.highlight_1 || "Quality build for everyday use"}</li>
                    <li className="flex gap-1.5"><span className="text-green-500">✓</span>{product.highlight_2 || "Comfortable, reliable, and durable"}</li>
                    <li className="flex gap-1.5"><span className="text-green-500">✓</span>{product.highlight_3 || "Designed to fit modern lifestyles"}</li>
                    <li className="flex gap-1.5"><span className="text-green-500">✓</span>{product.highlight_4 || "Popular choice in this category"}</li>
                  </ul>
                </div>
                {/* Reviews */}
                <div className="ml-10">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">Reviews</h2>
                  {isAuthenticated ? (
                    <form onSubmit={handleReviewSubmit} className="bg-gray-50 rounded p-2 mb-2">
                      <select value={reviewForm.rating} onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))} className="w-40 px-2 py-1 border border-gray-300 rounded text-xs mb-1">
                        {[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{"★".repeat(v)}{"☆".repeat(5-v)} {v} Stars</option>)}
                      </select>
                      <input type="text" value={reviewForm.title} onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))} className="w-60 px-2 py-1 flex border border-gray-300 rounded text-xs mb-1" placeholder="Title (optional)" />
                      <textarea rows="2" value={reviewForm.body} onChange={(e) => setReviewForm((prev) => ({ ...prev, body: e.target.value }))} className="w-full h-20 px-2 py-1 border border-gray-300 rounded text-xs mb-2" placeholder="Share your experience" />
                      {reviewError && <p className="text-xs text-red-600 mb-1">{reviewError}</p>}
                      <div className="flex gap-1">
                        <button type="submit" disabled={reviewSubmitting} className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-60">
                          {reviewSubmitting ? "..." : reviewEditingId ? "Update" : "Submit Review"}
                        </button>
                        {reviewEditingId && <button type="button" onClick={resetReviewForm} className="px-2 py-1 border border-gray-300 rounded text-xs">Cancel</button>}
                      </div>
                    </form>
                  ) : (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 text-center">Sign in to review.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Reviews List - Separate Section */}
            <div className="bg-white rounded-lg px-3 py-2">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Customer Reviews</h2>
              {reviewsLoading ? (
                <p className="text-xs text-gray-500 text-center py-2">Loading...</p>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">No reviews yet. Be the first to review this product.</p>
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
                      {(review.can_edit || review.can_delete) && (
                        <div className="flex gap-2 ml-4">
                          {review.can_edit && <button onClick={() => handleEditReview(review)} className="text-xs text-blue-600 hover:underline">Edit</button>}
                          {review.can_delete && <button onClick={() => handleDeleteReview(review.id)} className="text-xs text-red-600 hover:underline">Delete</button>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

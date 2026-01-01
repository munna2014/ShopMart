"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/axios";
import { addGuestItem } from "@/lib/guestCart";

export default function ProductDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

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
            price: product.price,
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

  const backLink = isAuthenticated ? "/components/customer?tab=shop" : "/products";

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <svg
                  className="w-6 h-6 text-white"
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
              <span className="text-xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ShopMart
              </span>
            </Link>
            <Link
              href={backLink}
              className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
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
            <Link
              href={backLink}
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Back to Products
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="relative">
                <img
                  src={product.image_url || product.image || "/images/default-product.svg"}
                  alt={imageDescriptionText}
                  className="w-full aspect-square object-cover rounded-2xl border border-gray-100"
                  onError={(e) => {
                    e.target.src = "/images/default-product.svg";
                  }}
                />
                <p className="mt-3 text-sm text-gray-600">
                  Image description:
                  {imageDescriptionLines.map((line, index) => (
                    <span key={index} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-600 font-semibold uppercase tracking-wide mb-2">
                  {product.category?.name || "Uncategorized"}
                </p>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  {product.name}
                </h1>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {product.description || "No description available."}
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-3xl font-bold text-gray-900">
                    {priceLabel}
                  </span>
                  <span className="text-sm text-gray-600">
                    {stockCount > 0 ? `${stockCount} in stock` : "Out of stock"}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
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
                    href={backLink}
                    className="flex-1 px-6 py-3 border border-green-200 text-green-700 rounded-xl font-semibold text-center hover:bg-green-50 transition-all"
                  >
                    Back to Products
                  </Link>
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Product details of {product.name}
                  </h2>
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

                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">
                      Highlights
                    </h3>
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
                      <li>{product.highlight_1 || "Quality build for everyday use"}</li>
                      <li>{product.highlight_2 || "Comfortable, reliable, and durable"}</li>
                      <li>{product.highlight_3 || "Designed to fit modern lifestyles"}</li>
                      <li>{product.highlight_4 || "Popular choice in this category"}</li>
                    </ul>
                  </div>

                  <div className="mt-6 border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

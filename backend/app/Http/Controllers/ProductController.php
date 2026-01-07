<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * Display a listing of products
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $products = Product::with('category')
                ->active()
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $products,
                'message' => 'Products retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve products',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created product
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'name' => 'required|string|max:255',
                'sku' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'price' => 'required|numeric|min:0',
                'currency' => 'nullable|string|max:3',
                'stock_quantity' => 'required|integer|min:0',
                'category_id' => 'required|exists:categories,id',
                'is_active' => 'boolean',
                'color' => 'nullable|string|max:100',
                'material' => 'nullable|string|max:100',
                'brand' => 'nullable|string|max:100',
                'size' => 'nullable|string|max:100',
                'weight' => 'nullable|string|max:100',
                'dimensions' => 'nullable|string|max:150',
                'highlight_1' => 'nullable|string|max:255',
                'highlight_2' => 'nullable|string|max:255',
                'highlight_3' => 'nullable|string|max:255',
                'highlight_4' => 'nullable|string|max:255',
                'discount_percent' => 'nullable|numeric|min:0|max:100',
                'discount_starts_at' => 'nullable|date',
                'discount_ends_at' => 'nullable|date|after_or_equal:discount_starts_at',
                'image' => 'nullable|image|mimes:png,jpg,jpeg|max:10240', // 10MB max
                'image_url' => 'nullable|string|max:500'
            ]);

            $image = $request->file('image');
            $product = $this->productService->createProduct($validatedData, $image);

            return response()->json([
                'status' => 'success',
                'data' => $product->load('category'),
                'message' => 'Product created successfully'
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create product',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store multiple products at once.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'products' => 'required|array|min:1',
                'products.*.name' => 'required|string|max:255',
                'products.*.sku' => 'nullable|string|max:100',
                'products.*.description' => 'nullable|string',
                'products.*.price' => 'required|numeric|min:0',
                'products.*.currency' => 'nullable|string|max:3',
                'products.*.stock_quantity' => 'required|integer|min:0',
                'products.*.category_id' => 'required|exists:categories,id',
                'products.*.is_active' => 'boolean',
                'products.*.color' => 'nullable|string|max:100',
                'products.*.material' => 'nullable|string|max:100',
                'products.*.brand' => 'nullable|string|max:100',
                'products.*.size' => 'nullable|string|max:100',
                'products.*.weight' => 'nullable|string|max:100',
                'products.*.dimensions' => 'nullable|string|max:150',
                'products.*.highlight_1' => 'nullable|string|max:255',
                'products.*.highlight_2' => 'nullable|string|max:255',
                'products.*.highlight_3' => 'nullable|string|max:255',
                'products.*.highlight_4' => 'nullable|string|max:255',
                'products.*.discount_percent' => 'nullable|numeric|min:0|max:100',
                'products.*.discount_starts_at' => 'nullable|date',
                'products.*.discount_ends_at' => 'nullable|date',
                'products.*.image_url' => 'nullable|string|max:500',
            ]);

            foreach ($validatedData['products'] as $index => $productData) {
                if (!empty($productData['discount_starts_at']) && !empty($productData['discount_ends_at'])) {
                    if ($productData['discount_ends_at'] < $productData['discount_starts_at']) {
                        throw ValidationException::withMessages([
                            "products.{$index}.discount_ends_at" => [
                                'End date must be on or after start date.',
                            ],
                        ]);
                    }
                }
            }

            $createdProducts = DB::transaction(function () use ($validatedData) {
                $products = [];
                foreach ($validatedData['products'] as $productData) {
                    $product = $this->productService->createProduct($productData, null);
                    $products[] = $product->load('category');
                }
                return $products;
            });

            return response()->json([
                'status' => 'success',
                'data' => $createdProducts,
                'message' => 'Products created successfully',
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create products',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified product
     */
    public function show(int $id): JsonResponse
    {
        try {
            $product = Product::with('category')->findOrFail($id);
            $discountPercent = $product->getActiveDiscountPercent();
            $product->setAttribute('discount_active', $discountPercent > 0);
            $product->setAttribute('discounted_price', $product->getDiscountedPrice());

            return response()->json([
                'status' => 'success',
                'data' => $product,
                'message' => 'Product retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Product not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified product
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'sku' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'price' => 'sometimes|required|numeric|min:0',
                'currency' => 'nullable|string|max:3',
                'stock_quantity' => 'sometimes|required|integer|min:0',
                'category_id' => 'sometimes|nullable|exists:categories,id',
                'is_active' => 'boolean',
                'color' => 'nullable|string|max:100',
                'material' => 'nullable|string|max:100',
                'brand' => 'nullable|string|max:100',
                'size' => 'nullable|string|max:100',
                'weight' => 'nullable|string|max:100',
                'dimensions' => 'nullable|string|max:150',
                'highlight_1' => 'nullable|string|max:255',
                'highlight_2' => 'nullable|string|max:255',
                'highlight_3' => 'nullable|string|max:255',
                'highlight_4' => 'nullable|string|max:255',
                'discount_percent' => 'nullable|numeric|min:0|max:100',
                'discount_starts_at' => 'nullable|date',
                'discount_ends_at' => 'nullable|date|after_or_equal:discount_starts_at',
                'image' => 'nullable|image|mimes:png,jpg,jpeg|max:10240', // 10MB max
                'image_url' => 'nullable|string|max:500'
            ]);

            $image = $request->file('image');
            $product = $this->productService->updateProduct($id, $validatedData, $image);

            return response()->json([
                'status' => 'success',
                'data' => $product->load('category'),
                'message' => 'Product updated successfully'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update product',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified product
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->productService->deleteProduct($id);

            return response()->json([
                'status' => 'success',
                'message' => 'Product deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete product',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get featured products for home page
     */
    public function featured(Request $request): JsonResponse
    {
        try {
            $limit = $request->get('limit', 8);
            $products = $this->productService->getFeaturedProducts($limit);

            // Transform products for frontend display
            $formattedProducts = $products->map(function ($product) {
                $basePrice = (float) $product->price;
                $discountPercent = $product->getActiveDiscountPercent();
                $discountedPrice = $product->getDiscountedPrice();
                $hasDiscount = $discountPercent > 0 && $discountedPrice < $basePrice;
                $averageRating = $product->reviews_avg_rating ?? 0;
                $reviewCount = $product->reviews_count ?? 0;

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'description' => $product->description,
                    'price' => '$' . number_format($hasDiscount ? $discountedPrice : $basePrice, 2),
                    'price_value' => $basePrice,
                    'discount_percent' => $discountPercent,
                    'discount_active' => $hasDiscount,
                    'discounted_price' => $discountedPrice,
                    'discounted_price_label' => '$' . number_format($discountedPrice, 2),
                    'discount_starts_at' => optional($product->discount_starts_at)->toISOString(),
                    'discount_ends_at' => optional($product->discount_ends_at)->toISOString(),
                    'image' => $product->image_url ?: '/images/default-product.svg',
                    'category' => $product->category ? $product->category->name : 'Uncategorized',
                    'stock' => $product->stock_quantity,
                    'rating' => $averageRating ? round($averageRating, 1) : 0,
                    'reviews' => $reviewCount,
                    'badge' => $product->stock_quantity > 0 ? null : 'Out of Stock',
                    'badgeColor' => $product->stock_quantity > 0 ? null : 'bg-red-500',
                    'oldPrice' => $hasDiscount ? '$' . number_format($basePrice, 2) : null,
                    'inStock' => $product->stock_quantity > 0,
                ];
            });

            return response()->json([
                'status' => 'success',
                'products' => $formattedProducts,
                'message' => 'Featured products retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve featured products',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get products for customer shop with filters.
     */
    public function customerProducts(Request $request): JsonResponse
    {
        try {
            $limit = (int) $request->get('limit', 50);
            $search = trim((string) $request->get('search', ''));
            $categoryId = $request->get('category_id');

            $query = Product::select(
                    'id',
                    'name',
                    'description',
                    'price',
                    'image_url',
                    'stock_quantity',
                    'category_id',
                    'discount_percent',
                    'discount_starts_at',
                    'discount_ends_at',
                    'created_at'
                )
                ->withAvg('reviews', 'rating')
                ->withCount('reviews')
                ->with(['category' => function ($categoryQuery) {
                    $categoryQuery->select('id', 'name');
                }])
                ->active()
                ->orderBy('created_at', 'desc');

            if ($search !== '') {
                $query->search($search);
            }

            if ($categoryId) {
                $query->where('category_id', $categoryId);
            }

            if ($limit > 0) {
                $query->limit($limit);
            }

            $products = $query->get();

            $formattedProducts = $products->map(function ($product) {
                $basePrice = (float) $product->price;
                $discountPercent = $product->getActiveDiscountPercent();
                $discountedPrice = $product->getDiscountedPrice();
                $hasDiscount = $discountPercent > 0 && $discountedPrice < $basePrice;
                $averageRating = $product->reviews_avg_rating ?? 0;
                $reviewCount = $product->reviews_count ?? 0;

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'description' => $product->description,
                    'price' => '$' . number_format($hasDiscount ? $discountedPrice : $basePrice, 2),
                    'price_value' => $basePrice,
                    'discount_percent' => $discountPercent,
                    'discount_active' => $hasDiscount,
                    'discounted_price' => $discountedPrice,
                    'discounted_price_label' => '$' . number_format($discountedPrice, 2),
                    'discount_starts_at' => optional($product->discount_starts_at)->toISOString(),
                    'discount_ends_at' => optional($product->discount_ends_at)->toISOString(),
                    'image' => $product->image_url ?: '/images/default-product.svg',
                    'category' => $product->category ? $product->category->name : 'Uncategorized',
                    'stock' => $product->stock_quantity,
                    'rating' => $averageRating ? round($averageRating, 1) : 0,
                    'reviews' => $reviewCount,
                    'badge' => $product->stock_quantity > 0 ? null : 'Out of Stock',
                    'badgeColor' => $product->stock_quantity > 0 ? null : 'bg-red-500',
                    'oldPrice' => $hasDiscount ? '$' . number_format($basePrice, 2) : null,
                    'inStock' => $product->stock_quantity > 0,
                ];
            });

            return response()->json([
                'status' => 'success',
                'products' => $formattedProducts,
                'message' => 'Products retrieved successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve products',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get product name suggestions for search autocomplete.
     */
    public function suggestions(Request $request): JsonResponse
    {
        try {
            $query = trim((string) $request->get('q', ''));
            $limit = (int) $request->get('limit', 6);
            if ($limit <= 0) {
                $limit = 6;
            }

            if ($query === '') {
                return response()->json([
                    'status' => 'success',
                    'suggestions' => [],
                ]);
            }

            $safeQuery = addcslashes($query, '%_\\');
            $suggestions = Product::select('id', 'name')
                ->active()
                ->where('name', 'like', $safeQuery . '%')
                ->orderBy('name')
                ->limit($limit)
                ->get();

            return response()->json([
                'status' => 'success',
                'suggestions' => $suggestions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve suggestions',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get products for admin dashboard with management data
     */
    public function adminIndex(Request $request): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $products = Product::with('category')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $products,
                'message' => 'Admin products retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve admin products',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

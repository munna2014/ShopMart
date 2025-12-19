<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
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
                'description' => 'nullable|string',
                'price' => 'required|numeric|min:0',
                'currency' => 'nullable|string|max:3',
                'stock_quantity' => 'required|integer|min:0',
                'category_id' => 'required|exists:categories,id',
                'is_active' => 'boolean',
                'image' => 'nullable|image|mimes:png,jpg,jpeg|max:10240' // 10MB max
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
     * Display the specified product
     */
    public function show(int $id): JsonResponse
    {
        try {
            $product = Product::with('category')->findOrFail($id);

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
                'description' => 'nullable|string',
                'price' => 'sometimes|required|numeric|min:0',
                'currency' => 'nullable|string|max:3',
                'stock_quantity' => 'sometimes|required|integer|min:0',
                'category_id' => 'sometimes|required|exists:categories,id',
                'is_active' => 'boolean',
                'image' => 'nullable|image|mimes:png,jpg,jpeg|max:10240' // 10MB max
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
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'description' => $product->description,
                    'price' => '$' . number_format($product->price, 2),
                    'image' => $product->image_url ?: '/images/default-product.svg',
                    'category' => $product->category ? $product->category->name : 'Uncategorized',
                    'stock' => $product->stock_quantity,
                    'rating' => 4, // Default rating - you can add a rating system later
                    'reviews' => rand(10, 100), // Mock reviews - you can add a review system later
                    'badge' => $product->stock_quantity > 0 ? null : 'Out of Stock',
                    'badgeColor' => $product->stock_quantity > 0 ? null : 'bg-red-500',
                    'oldPrice' => null, // You can add sale price functionality later
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
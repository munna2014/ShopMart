<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Category;
use App\Services\ImageUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ProductService
{
    protected ImageUploadService $imageUploadService;

    public function __construct(ImageUploadService $imageUploadService)
    {
        $this->imageUploadService = $imageUploadService;
    }

    /**
     * Create a new product
     */
    public function createProduct(array $data, ?UploadedFile $image = null): Product
    {
        return DB::transaction(function () use ($data, $image) {
            // Validate category exists
            $category = Category::findOrFail($data['category_id']);

            // Set default values
            $data['currency'] = $data['currency'] ?? 'USD';
            $data['is_active'] = $data['is_active'] ?? true;

            // Handle image upload
            if ($image) {
                $data['image_url'] = $this->imageUploadService->uploadProductImage($image);
            } else {
                $data['image_url'] = $this->imageUploadService->getDefaultImageUrl();
            }

            // Create product
            $product = Product::create($data);

            return $product;
        });
    }

    /**
     * Update an existing product
     */
    public function updateProduct(int $id, array $data, ?UploadedFile $image = null): Product
    {
        return DB::transaction(function () use ($id, $data, $image) {
            $product = Product::findOrFail($id);

            // Validate category exists if provided
            if (isset($data['category_id'])) {
                Category::findOrFail($data['category_id']);
            }

            // Handle image upload
            if ($image) {
                // Delete old image if exists
                if ($product->image_url && !$this->imageUploadService->isDefaultImage($product->image_url)) {
                    $this->imageUploadService->deleteProductImage($product->image_url);
                }
                
                $data['image_url'] = $this->imageUploadService->uploadProductImage($image);
            }

            // Update product
            $product->update($data);

            return $product->fresh();
        });
    }

    /**
     * Delete a product
     */
    public function deleteProduct(int $id): bool
    {
        return DB::transaction(function () use ($id) {
            $product = Product::findOrFail($id);

            // Delete associated image if not default
            if ($product->image_url && !$this->imageUploadService->isDefaultImage($product->image_url)) {
                $this->imageUploadService->deleteProductImage($product->image_url);
            }

            return $product->delete();
        });
    }

    /**
     * Get featured products for home page
     */
    public function getFeaturedProducts(int $limit = 8): Collection
    {
        return Product::with('category')
            ->active()
            ->where('stock_quantity', '>', 0)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get products for customer view with stock information
     */
    public function getCustomerProducts(int $limit = null): Collection
    {
        $query = Product::with('category')
            ->active()
            ->orderBy('created_at', 'desc');

        if ($limit) {
            $query->limit($limit);
        }

        return $query->get();
    }

    /**
     * Get product statistics for admin dashboard
     */
    public function getProductStatistics(): array
    {
        return [
            'total_products' => Product::count(),
            'active_products' => Product::active()->count(),
            'in_stock_products' => Product::where('stock_quantity', '>', 0)->count(),
            'out_of_stock_products' => Product::where('stock_quantity', 0)->count(),
            'total_categories' => Category::where('is_active', true)->count(),
        ];
    }

    /**
     * Search products by name or description
     */
    public function searchProducts(string $searchTerm, int $limit = 20): Collection
    {
        return Product::with('category')
            ->active()
            ->where(function ($query) use ($searchTerm) {
                $query->where('name', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('description', 'LIKE', "%{$searchTerm}%");
            })
            ->orderBy('name')
            ->limit($limit)
            ->get();
    }
}
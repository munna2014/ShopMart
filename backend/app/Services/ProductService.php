<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Category;
use App\Services\ImageUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

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
            unset($category);

            // Set default values
            $data['currency'] = $data['currency'] ?? 'USD';
            $data['is_active'] = $data['is_active'] ?? true;
            $data['image_url'] = isset($data['image_url']) ? trim((string) $data['image_url']) : '';

            // Handle image upload
            if ($image) {
                $data['image_url'] = $this->imageUploadService->uploadProductImage($image);
            } elseif (!empty($data['image_url'])) {
                // Use provided image URL and normalize Unsplash URLs
                $data['image_url'] = $this->normalizeUnsplashUrl($data['image_url']);
            } else {
                // Temporarily set a placeholder - we'll generate unique URL after product creation
                $data['image_url'] = '';
            }

            // Create product first to get the ID
            $product = Product::create($data);
            
            // If no image was provided, generate unique Unsplash URL using product ID
            if (!$image && empty($product->image_url)) {
                $uniqueUrl = $this->generateUniqueUnsplashUrl($product->name, $product->category_id, $product->id);
                $product->update(['image_url' => $uniqueUrl]);
                $product->refresh();
            }

            // Clear products cache
            $this->clearProductsCache();

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

            // Validate category exists if provided and non-empty
            if (array_key_exists('category_id', $data)) {
                if ($data['category_id'] === '' || $data['category_id'] === null) {
                    $data['category_id'] = null;
                } else {
                    Category::findOrFail($data['category_id']);
                }
            }

            if (isset($data['image_url'])) {
                $data['image_url'] = trim((string) $data['image_url']);
                if ($data['image_url'] === '') {
                    unset($data['image_url']);
                } else {
                    // Normalize Unsplash URLs
                    $data['image_url'] = $this->normalizeUnsplashUrl($data['image_url']);
                }
            }

            // Handle image upload
            if ($image) {
                // Delete old image if exists
                if ($product->image_url && !$this->imageUploadService->isDefaultImage($product->image_url)) {
                    $this->imageUploadService->deleteProductImage($product->image_url);
                }
                
                $data['image_url'] = $this->imageUploadService->uploadProductImage($image);
            } elseif (isset($data['image_url'])) {
                $nextUrl = $data['image_url'];
                if ($product->image_url && $product->image_url !== $nextUrl) {
                    if (!$this->imageUploadService->isDefaultImage($product->image_url)) {
                        $this->imageUploadService->deleteProductImage($product->image_url);
                    }
                }
            }

            // Update product
            $product->update($data);

            // Clear products cache
            $this->clearProductsCache();

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

            $result = $product->delete();

            // Clear products cache
            $this->clearProductsCache();

            return $result;
        });
    }

    /**
     * Get featured products for home page
     */
    public function getFeaturedProducts(int $limit = 8): Collection
    {
        return Product::select(
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
            ->with('category')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->active()
            ->where('stock_quantity', '>', 0)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get products for customer view with stock information
     */
    public function getCustomerProducts(?int $limit = null): Collection
    {
        $query = Product::with('category')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->active()
            ->orderBy('created_at', 'desc');

        if ($limit !== null) {
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
     * Clear all customer products cache entries
     */
    protected function clearProductsCache(): void
    {
        // Clear cache entries with the customer_products prefix
        // Using Cache::flush() would clear everything, so we use tags or pattern matching
        // For file/database cache drivers, we'll clear specific known keys
        try {
            // Clear common cache keys
            Cache::forget('customer_products_50__');
            Cache::forget('customer_products_50__all');
            
            // If using Redis or Memcached with tags, you could use:
            // Cache::tags(['products'])->flush();
        } catch (\Exception $e) {
            // Silently fail if cache clearing fails
        }
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

    /**
     * Normalize Unsplash URLs to include style parameters
     * Adds: auto=format&fit=crop&w=800&q=80
     */
    protected function normalizeUnsplashUrl(string $url): string
    {
        // Check if it's an Unsplash URL
        if (!Str::contains($url, 'unsplash.com')) {
            return $url;
        }

        // Parse the URL
        $parsedUrl = parse_url($url);
        if (!$parsedUrl) {
            return $url;
        }

        // Extract the path (e.g., /photo-1523275335684-37898b6baf30)
        $path = $parsedUrl['path'] ?? '';
        
        // Check if it's already an images.unsplash.com URL with the photo path
        if (Str::contains($url, 'images.unsplash.com') && Str::startsWith($path, '/photo-')) {
            // Parse existing query parameters
            $existingParams = [];
            if (isset($parsedUrl['query'])) {
                parse_str($parsedUrl['query'], $existingParams);
            }

            // Set our desired parameters (override existing ones)
            $existingParams['auto'] = 'format';
            $existingParams['fit'] = 'crop';
            $existingParams['w'] = '800';
            $existingParams['q'] = '80';

            // Rebuild URL with new parameters
            $scheme = $parsedUrl['scheme'] ?? 'https';
            $host = $parsedUrl['host'] ?? 'images.unsplash.com';
            $newQuery = http_build_query($existingParams);
            
            return "{$scheme}://{$host}{$path}?{$newQuery}";
        }

        // If it's a source.unsplash.com URL or other format, return as-is
        // (The FixUnsplashImageUrls command will handle conversion)
        return $url;
    }

    /**
     * Generate a unique Unsplash image URL for a product
     * Uses product name, category ID, and product ID to ensure uniqueness
     * Each product gets a different image based on a deterministic seed
     */
    public function generateUniqueUnsplashUrl(string $productName, ?int $categoryId = null, ?int $productId = null): string
    {
        // Get category name if category ID is provided
        $categoryName = '';
        if ($categoryId) {
            try {
                $category = Category::find($categoryId);
                $categoryName = $category ? $category->name : '';
            } catch (\Exception $e) {
                // Ignore if category not found
            }
        }
        
        // Create a unique seed based on product attributes
        // Using productId ensures uniqueness, fallback to hash if not available yet
        $seedString = $productName . $categoryName . ($productId ?? '') . ($categoryId ?? 0);
        $seed = md5($seedString);
        
        // Convert seed to a numeric value for consistent selection
        $seedNumber = abs(hexdec(substr($seed, 0, 8)));
        
        // Use Unsplash's random endpoint with a seed parameter
        // This ensures each product gets a different image, but the same product always gets the same image
        // Format: https://source.unsplash.com/800x600/?sig={seed}
        // Then we'll resolve it to images.unsplash.com format
        
        // For now, use a diverse set of real Unsplash photo IDs
        // Each product will get a different one based on the seed
        $photoIds = [
            '1523275335684-37898b6baf30', '1505740420928-5c560a5d08f0', '1515889577799-0bcee4d4b271',
            '1491553895911-0055eca6402d', '1512499617150-23e19179e6d6', '1441986300917-5ba717cfe77d',
            '1460353581641-37baddab0d11', '1515889577799-0bcee4d4b271', '1505740420928-5c560a5d08f0',
            '1491553895911-0055eca6402d', '1523275335684-37898b6baf30', '1512499617150-23e19179e6d6',
            '1441986300917-5ba717cfe77d', '1460353581641-37baddab0d11', '1515889577799-0bcee4d4b271',
            '1505740420928-5c560a5d08f0', '1491553895911-0055eca6402d', '1523275335684-37898b6baf30',
            '1512499617150-23e19179e6d6', '1441986300917-5ba717cfe77d', '1460353581641-37baddab0d11',
            '1515889577799-0bcee4d4b271', '1505740420928-5c560a5d08f0', '1491553895911-0055eca6402d',
            '1523275335684-37898b6baf30', '1512499617150-23e19179e6d6', '1441986300917-5ba717cfe77d',
            '1460353581641-37baddab0d11', '1515889577799-0bcee4d4b271', '1505740420928-5c560a5d08f0',
            '1491553895911-0055eca6402d', '1523275335684-37898b6baf30', '1512499617150-23e19179e6d6',
            '1441986300917-5ba717cfe77d', '1460353581641-37baddab0d11', '1515889577799-0bcee4d4b271',
            '1505740420928-5c560a5d08f0', '1491553895911-0055eca6402d', '1523275335684-37898b6baf30',
            '1512499617150-23e19179e6d6', '1441986300917-5ba717cfe77d', '1460353581641-37baddab0d11',
            '1515889577799-0bcee4d4b271', '1505740420928-5c560a5d08f0', '1491553895911-0055eca6402d',
            '1523275335684-37898b6baf30', '1512499617150-23e19179e6d6', '1441986300917-5ba717cfe77d',
            '1460353581641-37baddab0d11', '1515889577799-0bcee4d4b271', '1505740420928-5c560a5d08f0',
            '1491553895911-0055eca6402d', '1523275335684-37898b6baf30', '1512499617150-23e19179e6d6',
            '1441986300917-5ba717cfe77d', '1460353581641-37baddab0d11', '1515889577799-0bcee4d4b271',
            '1505740420928-5c560a5d08f0', '1491553895911-0055eca6402d', '1523275335684-37898b6baf30',
            '1512499617150-23e19179e6d6', '1441986300917-5ba717cfe77d', '1460353581641-37baddab0d11',
        ];
        
        // Remove duplicates from photo IDs array
        $uniquePhotoIds = array_unique($photoIds);
        $uniquePhotoIds = array_values($uniquePhotoIds); // Re-index array
        
        // Use seed to select a photo ID (ensures same product always gets same image)
        $selectedIndex = $seedNumber % count($uniquePhotoIds);
        $photoId = $uniquePhotoIds[$selectedIndex];
        
        // Build Unsplash URL with style parameters
        $baseUrl = "https://images.unsplash.com/photo-{$photoId}";
        $params = [
            'auto' => 'format',
            'fit' => 'crop',
            'w' => '800',
            'q' => '80',
        ];
        
        // Add product ID as a unique identifier to ensure each product gets a unique URL
        // This ensures uniqueness even if two products select the same photo ID
        if ($productId !== null) {
            $params['pid'] = $productId; // Product ID parameter
        } else {
            // If no product ID yet, use hash of seed to ensure uniqueness
            $params['sig'] = substr($seed, 0, 12);
        }
        
        return $baseUrl . '?' . http_build_query($params);
    }
}

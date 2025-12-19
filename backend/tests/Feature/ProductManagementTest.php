<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Category;
use App\Models\User;
use App\Services\ProductService;
use App\Services\ImageUploadService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductManagementTest extends TestCase
{
    use RefreshDatabase;

    protected ProductService $productService;
    protected User $adminUser;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create admin role
        $adminRole = \App\Models\Role::create([
            'name' => 'admin',
            'description' => 'Administrator role for testing'
        ]);
        
        // Create admin user
        $this->adminUser = User::factory()->create();
        $this->adminUser->assignRole('admin');
        
        // Create a test category
        $this->category = Category::create([
            'name' => 'Test Category',
            'slug' => 'test-category',
            'description' => 'A test category',
            'is_active' => true,
            'sort_order' => 1,
        ]);
        
        $this->productService = app(ProductService::class);
        
        // Fake storage for testing
        Storage::fake('public');
    }

    /**
     * **Feature: product-management, Property 1: Product creation with validation**
     * 
     * Property: For any valid product data including name, description, price, 
     * stock quantity, and existing category ID, creating a product should result 
     * in a new database record with all attributes correctly stored and proper 
     * category association.
     * 
     * **Validates: Requirements 1.1, 6.1, 7.1**
     */
    public function test_product_creation_with_validation_property()
    {
        // Run property test with multiple iterations
        for ($i = 0; $i < 100; $i++) {
            $this->runProductCreationProperty();
        }
    }

    protected function runProductCreationProperty(): void
    {
        // Generate random valid product data
        $productData = $this->generateValidProductData();
        
        // Create product using service
        $product = $this->productService->createProduct($productData);
        
        // Verify product was created in database
        $this->assertDatabaseHas('products', [
            'name' => $productData['name'],
            'description' => $productData['description'],
            'price' => $productData['price'],
            'currency' => $productData['currency'] ?? 'USD',
            'stock_quantity' => $productData['stock_quantity'],
            'category_id' => $productData['category_id'],
            'is_active' => $productData['is_active'] ?? true,
        ]);
        
        // Verify product instance has correct attributes
        $this->assertEquals($productData['name'], $product->name);
        $this->assertEquals($productData['description'], $product->description);
        $this->assertEquals($productData['price'], (float)$product->price);
        $this->assertEquals($productData['currency'] ?? 'USD', $product->currency);
        $this->assertEquals($productData['stock_quantity'], $product->stock_quantity);
        $this->assertEquals($productData['category_id'], $product->category_id);
        $this->assertEquals($productData['is_active'] ?? true, $product->is_active);
        
        // Verify category association
        $this->assertNotNull($product->category);
        $this->assertEquals($this->category->id, $product->category->id);
        $this->assertEquals($this->category->name, $product->category->name);
        
        // Verify default image is assigned when no image provided
        if (!isset($productData['image'])) {
            $this->assertEquals('/images/default-product.svg', $product->image_url);
        }
        
        // Verify product is retrievable
        $retrievedProduct = Product::find($product->id);
        $this->assertNotNull($retrievedProduct);
        $this->assertEquals($product->name, $retrievedProduct->name);
        
        // Clean up for next iteration
        $product->delete();
    }

    /**
     * Generate valid random product data for property testing
     */
    protected function generateValidProductData(): array
    {
        $faker = fake();
        
        return [
            'name' => $faker->words(rand(1, 5), true),
            'description' => $faker->optional(0.8)->paragraph(),
            'price' => $faker->randomFloat(2, 0.01, 9999.99),
            'currency' => $faker->optional(0.3)->randomElement(['USD', 'EUR', 'GBP']),
            'stock_quantity' => $faker->numberBetween(0, 1000),
            'category_id' => $this->category->id,
            'is_active' => $faker->optional(0.2)->boolean() ?? true,
        ];
    }

    /**
     * Test product creation with image upload
     */
    public function test_product_creation_with_image_upload()
    {
        // Skip if GD extension is not available
        if (!function_exists('imagecreatetruecolor')) {
            $this->markTestSkipped('GD extension is not installed.');
        }
        
        // Create a fake image file
        $image = UploadedFile::fake()->image('product.jpg', 800, 600)->size(1024); // 1MB
        
        $productData = $this->generateValidProductData();
        
        // Create product with image
        $product = $this->productService->createProduct($productData, $image);
        
        // Verify product was created
        $this->assertDatabaseHas('products', [
            'name' => $productData['name'],
            'category_id' => $productData['category_id'],
        ]);
        
        // Verify image was uploaded (not default)
        $this->assertNotEquals('/images/default-product.svg', $product->image_url);
        $this->assertStringContains('/storage/products/', $product->image_url);
    }

    /**
     * Test product creation validation errors
     */
    public function test_product_creation_validation_errors()
    {
        // Test missing required fields
        $this->expectException(\Exception::class);
        
        $invalidData = [
            'description' => 'Test description',
            // Missing required fields: name, price, stock_quantity, category_id
        ];
        
        $this->productService->createProduct($invalidData);
    }

    /**
     * Test product creation with invalid category
     */
    public function test_product_creation_with_invalid_category()
    {
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        
        $productData = $this->generateValidProductData();
        $productData['category_id'] = 99999; // Non-existent category
        
        $this->productService->createProduct($productData);
    }

    /**
     * Test product creation with negative price
     */
    public function test_product_creation_with_negative_values()
    {
        // Test with negative price - should be allowed at service level
        // (validation happens at controller level)
        $productData = $this->generateValidProductData();
        $productData['price'] = -10.50;
        
        $product = $this->productService->createProduct($productData);
        $this->assertEquals(-10.50, (float)$product->price);
        
        // Test with negative stock - should be allowed
        $productData['stock_quantity'] = -5;
        $product2 = $this->productService->createProduct($productData);
        $this->assertEquals(-5, $product2->stock_quantity);
    }
}
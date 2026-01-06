<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'sku',
        'description',
        'price',
        'currency',
        'stock_quantity',
        'image_url',
        'is_active',
        'category_id',
        'color',
        'material',
        'brand',
        'size',
        'weight',
        'dimensions',
        'highlight_1',
        'highlight_2',
        'highlight_3',
        'highlight_4',
        'discount_percent',
        'discount_starts_at',
        'discount_ends_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'is_active' => 'boolean',
        'discount_percent' => 'decimal:2',
        'discount_starts_at' => 'datetime',
        'discount_ends_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Category relationship
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Product images relationship
     */
    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    /**
     * Primary image relationship
     */
    public function primaryImage()
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    /**
     * Price history relationship
     */
    public function priceHistory()
    {
        return $this->hasMany(PriceHistory::class);
    }

    /**
     * Cart items relationship
     */
    public function cartItems()
    {
        return $this->hasMany(CartItem::class);
    }

    /**
     * Order items relationship
     */
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Reviews for this product
     */
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Active discount percent for this product.
     */
    public function getActiveDiscountPercent(): float
    {
        $percent = (float) ($this->discount_percent ?? 0);
        if ($percent <= 0) {
            return 0.0;
        }

        $now = now();
        if ($this->discount_starts_at && $now->lt($this->discount_starts_at)) {
            return 0.0;
        }
        if ($this->discount_ends_at && $now->gt($this->discount_ends_at)) {
            return 0.0;
        }

        return $percent;
    }

    /**
     * Discounted price for this product based on active window.
     */
    public function getDiscountedPrice(): float
    {
        $price = (float) $this->price;
        $percent = $this->getActiveDiscountPercent();
        if ($percent <= 0) {
            return $price;
        }

        return round($price * (1 - ($percent / 100)), 2);
    }

    /**
     * Translations for this product
     */
    public function translations()
    {
        return $this->hasMany(Translation::class, 'object_id')
            ->where('object_type', 'PRODUCT');
    }

    /**
     * Check if product is in stock
     */
    public function inStock(): bool
    {
        return $this->stock_quantity > 0;
    }

    /**
     * Decrease stock quantity
     */
    public function decreaseStock(int $quantity)
    {
        if ($this->stock_quantity < $quantity) {
            throw new \Exception('Insufficient stock');
        }

        $this->stock_quantity -= $quantity;
        $this->save();
    }

    /**
     * Increase stock quantity
     */
    public function increaseStock(int $quantity)
    {
        $this->stock_quantity += $quantity;
        $this->save();
    }

    /**
     * Update price and log to history
     */
    public function updatePrice(float $newPrice, ?int $changedBy = null)
    {
        $oldPrice = $this->price;

        PriceHistory::create([
            'product_id' => $this->id,
            'old_price' => $oldPrice,
            'new_price' => $newPrice,
            'currency' => $this->currency,
            'changed_by' => $changedBy,
        ]);

        $this->price = $newPrice;
        $this->save();
    }

    /**
     * Scope for active products
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for in-stock products
     */
    public function scopeInStock($query)
    {
        return $query->where('stock_quantity', '>', 0);
    }

    /**
     * Full-text search scope
     */
    public function scopeSearch($query, string $searchTerm)
    {
        // Use FULLTEXT search for MySQL, LIKE for other databases
        if (config('database.default') === 'mysql') {
            return $query->whereRaw(
                "MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE)",
                [$searchTerm]
            );
        } else {
            return $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('description', 'LIKE', "%{$searchTerm}%");
            });
        }
    }
}

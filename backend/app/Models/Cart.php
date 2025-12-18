<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'session_id',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * User relationship
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Cart items relationship
     */
    public function items()
    {
        return $this->hasMany(CartItem::class);
    }

    /**
     * Get total cart value
     */
    public function getTotal()
    {
        return $this->items->sum(function ($item) {
            return $item->unit_price * $item->quantity;
        });
    }

    /**
     * Get total items count
     */
    public function getTotalItems()
    {
        return $this->items->sum('quantity');
    }

    /**
     * Add item to cart
     */
    public function addItem(Product $product, int $quantity = 1)
    {
        $existingItem = $this->items()->where('product_id', $product->id)->first();

        if ($existingItem) {
            $existingItem->quantity += $quantity;
            $existingItem->save();
            return $existingItem;
        }

        return $this->items()->create([
            'product_id' => $product->id,
            'quantity' => $quantity,
            'unit_price' => $product->price,
        ]);
    }

    /**
     * Remove item from cart
     */
    public function removeItem(int $productId)
    {
        return $this->items()->where('product_id', $productId)->delete();
    }

    /**
     * Clear all items from cart
     */
    public function clear()
    {
        return $this->items()->delete();
    }

    /**
     * Mark cart as checked out
     */
    public function markAsCheckedOut()
    {
        $this->status = 'CHECKED_OUT';
        $this->save();
    }

    /**
     * Scope for active carts
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'ACTIVE');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'cart_id',
        'product_id',
        'quantity',
        'unit_price',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    /**
     * Cart relationship
     */
    public function cart()
    {
        return $this->belongsTo(Cart::class);
    }

    /**
     * Product relationship
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get subtotal for this item
     */
    public function getSubtotal()
    {
        return $this->unit_price * $this->quantity;
    }

    /**
     * Update quantity
     */
    public function updateQuantity(int $quantity)
    {
        if ($quantity <= 0) {
            $this->delete();
            return;
        }

        $this->quantity = $quantity;
        $this->save();
    }
}

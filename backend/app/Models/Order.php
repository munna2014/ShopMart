<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'status',
        'payment_method',
        'payment_status',
        'stripe_payment_intent_id',
        'stripe_payment_status',
        'paid_at',
        'total_amount',
        'currency',
        'shipping_address',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'shipping_address' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    /**
     * User relationship
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Order items relationship
     */
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Shipments relationship
     */
    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }

    /**
     * Calculate total from items
     */
    public function calculateTotal()
    {
        $this->total_amount = $this->items->sum('total_price');
        $this->save();
        return $this->total_amount;
    }

    /**
     * Update order status
     */
    public function updateStatus(string $status)
    {
        $this->status = $status;
        $isCodPayment = $this->payment_method === 'COD' || $this->payment_method === null;
        if ($isCodPayment && $status === 'DELIVERED') {
            if ($this->payment_method === null) {
                $this->payment_method = 'COD';
            }
            $this->payment_status = 'PAID';
            if (!$this->paid_at) {
                $this->paid_at = now();
            }
        }
        $this->save();

        // Log audit
        AuditLog::create([
            'actor_user_id' => auth()->id(),
            'entity_type' => 'ORDER',
            'entity_id' => $this->id,
            'action' => 'STATUS_CHANGE',
            'old_data' => ['status' => $this->getOriginal('status')],
            'new_data' => ['status' => $status],
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * Create order from cart
     */
    public static function createFromCart(Cart $cart, array $shippingAddress)
    {
        $order = self::create([
            'user_id' => $cart->user_id,
            'status' => 'PENDING',
            'total_amount' => 0,
            'currency' => 'USD',
            'shipping_address' => $shippingAddress,
        ]);

        foreach ($cart->items as $cartItem) {
            $order->items()->create([
                'product_id' => $cartItem->product_id,
                'quantity' => $cartItem->quantity,
                'unit_price' => $cartItem->unit_price,
                'total_price' => $cartItem->unit_price * $cartItem->quantity,
            ]);
        }

        $order->calculateTotal();
        $cart->markAsCheckedOut();

        return $order;
    }

    /**
     * Scope for pending orders
     */
    public function scopePending($query)
    {
        return $query->where('status', 'PENDING');
    }

    /**
     * Scope for paid orders
     */
    public function scopePaid($query)
    {
        return $query->where('status', 'PAID');
    }

    /**
     * Scope for shipped orders
     */
    public function scopeShipped($query)
    {
        return $query->where('status', 'SHIPPED');
    }
}

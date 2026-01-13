<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Mail\OrderDelivered;
use Illuminate\Support\Facades\Mail;
use App\Models\CustomerNotification;

class Shipment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'carrier',
        'tracking_number',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Order relationship
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Shipment events relationship
     */
    public function events()
    {
        return $this->hasMany(ShipmentEvent::class)->orderBy('event_time', 'desc');
    }

    /**
     * Latest event relationship
     */
    public function latestEvent()
    {
        return $this->hasOne(ShipmentEvent::class)->latestOfMany('event_time');
    }

    /**
     * Update shipment status and create event
     */
    public function updateStatus(string $status, ?string $note = null, ?array $rawPayload = null)
    {
        $this->status = $status;
        $this->save();

        $this->events()->create([
            'status' => $status,
            'event_time' => now(),
            'note' => $note,
            'raw_payload' => $rawPayload,
        ]);

        // Update order status if delivered
        if ($status === 'DELIVERED') {
            $order = $this->order;
            $wasDelivered = $order && $order->status === 'DELIVERED';
            $this->order->updateStatus('DELIVERED');

            if ($order && !$wasDelivered) {
                $orderLabel = sprintf('#ORD-%05d', $order->id);
                CustomerNotification::create([
                    'user_id' => $order->user_id,
                    'order_id' => $order->id,
                    'type' => 'ORDER_DELIVERED',
                    'title' => 'Order delivered',
                    'message' => "Your order {$orderLabel} has been delivered.",
                    'is_read' => false,
                ]);

                if ($order->user && $order->user->email) {
                    Mail::to($order->user->email)->queue(new OrderDelivered($order));
                }
            }
        }
    }

    /**
     * Scope for in-transit shipments
     */
    public function scopeInTransit($query)
    {
        return $query->where('status', 'IN_TRANSIT');
    }

    /**
     * Scope for delivered shipments
     */
    public function scopeDelivered($query)
    {
        return $query->where('status', 'DELIVERED');
    }
}

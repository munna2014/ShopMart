<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Shipment;
use App\Models\UserAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * List orders for the authenticated customer.
     */
    public function index(Request $request): JsonResponse
    {
        $orders = Order::select('id', 'user_id', 'status', 'total_amount', 'currency', 'created_at')
            ->with([
                'items' => function ($query) {
                    $query->select('id', 'order_id', 'product_id', 'quantity', 'unit_price', 'total_price')
                        ->with([
                            'product' => function ($productQuery) {
                                $productQuery->select('id', 'name', 'price', 'image_url');
                            },
                        ]);
                },
            ])
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'orders' => $orders,
        ]);
    }

    /**
     * Place a new order from checkout.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address_id' => 'required|integer',
        ]);

        try {
            $order = DB::transaction(function () use ($validated, $request) {
                $user = $request->user();

                $address = UserAddress::where('user_id', $user->id)
                    ->where('id', $validated['address_id'])
                    ->firstOrFail();

                $cart = \App\Models\Cart::active()
                    ->where('user_id', $user->id)
                    ->with('items')
                    ->first();

                if (!$cart || $cart->items->isEmpty()) {
                    throw ValidationException::withMessages([
                        'items' => ['Cart is empty.'],
                    ]);
                }

                $order = Order::create([
                    'user_id' => $user->id,
                    'status' => 'PENDING',
                    'total_amount' => 0,
                    'currency' => 'USD',
                    'shipping_address' => [
                        'full_name' => $address->full_name,
                        'phone' => $address->phone,
                        'address_line_1' => $address->address_line_1,
                        'address_line_2' => $address->address_line_2,
                        'city' => $address->city,
                        'state_province' => $address->state_province,
                        'postal_code' => $address->postal_code,
                        'country' => $address->country,
                    ],
                ]);

                $total = 0;

                foreach ($cart->items as $cartItem) {
                    $product = Product::where('id', $cartItem->product_id)
                        ->lockForUpdate()
                        ->firstOrFail();

                    if ($product->stock_quantity < $cartItem->quantity) {
                        throw ValidationException::withMessages([
                            'items' => ["Insufficient stock for {$product->name}."],
                        ]);
                    }

                    $unitPrice = (float) $product->price;
                    $lineTotal = $unitPrice * $cartItem->quantity;

                    $order->items()->create([
                        'product_id' => $product->id,
                        'quantity' => $cartItem->quantity,
                        'unit_price' => $unitPrice,
                        'total_price' => $lineTotal,
                    ]);

                    $product->decreaseStock($cartItem->quantity);
                    $total += $lineTotal;
                }

                $order->update(['total_amount' => $total]);

                // Mark cart as checked out and clear items
                $cart->markAsCheckedOut();
                $cart->clear();

                // Create shipment with initial event
                $trackingNumber = 'TRK-' . $order->id . '-' . strtoupper(bin2hex(random_bytes(4)));
                $shipment = Shipment::create([
                    'order_id' => $order->id,
                    'carrier' => null,
                    'tracking_number' => $trackingNumber,
                    'status' => 'CREATED',
                ]);
                $shipment->events()->create([
                    'status' => 'CREATED',
                    'event_time' => now(),
                    'note' => 'Shipment created',
                ]);

                return $order->load(['items.product', 'user']);
            });

            return response()->json([
                'status' => 'success',
                'order' => $order,
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to place order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * List orders for admin management.
     */
    public function adminIndex(): JsonResponse
    {
        $orders = Order::with(['items.product', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'orders' => $orders,
        ]);
    }

    /**
     * Cancel a pending order (customer).
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        try {
            $order = DB::transaction(function () use ($request, $id) {
                $order = Order::with('items')
                    ->where('id', $id)
                    ->where('user_id', $request->user()->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($order->status !== 'PENDING') {
                    throw ValidationException::withMessages([
                        'status' => ['Only pending orders can be cancelled.'],
                    ]);
                }

                foreach ($order->items as $item) {
                    $product = Product::where('id', $item->product_id)
                        ->lockForUpdate()
                        ->first();
                    if ($product) {
                        $product->increaseStock($item->quantity);
                    }
                }

                $order->updateStatus('CANCELLED');

                $shipment = Shipment::where('order_id', $order->id)->first();
                if ($shipment && $shipment->status !== 'CANCELLED') {
                    $shipment->updateStatus('CANCELLED', 'Cancelled by customer');
                }

                return $order->fresh(['items.product']);
            });

            return response()->json([
                'status' => 'success',
                'order' => $order,
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to cancel order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update order status (admin).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:PENDING,PAID,SHIPPED,DELIVERED,CANCELLED',
        ]);

        $order = Order::findOrFail($id);
        $order->status = $validated['status'];
        $order->save();

        $shipment = Shipment::where('order_id', $order->id)->first();
        if ($shipment) {
            $shipmentStatus = $shipment->status;
            if ($validated['status'] === 'SHIPPED') {
                $shipmentStatus = 'IN_TRANSIT';
            } elseif ($validated['status'] === 'DELIVERED') {
                $shipmentStatus = 'DELIVERED';
            } elseif ($validated['status'] === 'CANCELLED') {
                $shipmentStatus = 'CANCELLED';
            }

            if ($shipmentStatus !== $shipment->status) {
                $shipment->updateStatus($shipmentStatus, 'Updated via admin order status');
            }
        }

        return response()->json([
            'status' => 'success',
            'order' => $order,
        ]);
    }
}

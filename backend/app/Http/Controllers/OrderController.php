<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\CustomerNotification;
use App\Models\Product;
use App\Models\Shipment;
use App\Models\UserAddress;
use App\Mail\OrderDelivered;
use App\Mail\OrderShipped;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * List orders for the authenticated customer.
     */
    public function index(Request $request): JsonResponse
    {
        $orders = Order::select('id', 'user_id', 'status', 'total_amount', 'currency', 'payment_method', 'payment_status', 'paid_at', 'created_at')
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
     * Return summary metrics for the authenticated customer.
     */
    public function summary(Request $request): JsonResponse
    {
        $summary = Order::where('user_id', $request->user()->id)
            ->where('status', '!=', 'CANCELLED')
            ->selectRaw('COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_spent')
            ->first();

        return response()->json([
            'status' => 'success',
            'total_orders' => (int) ($summary->total_orders ?? 0),
            'total_spent' => (float) ($summary->total_spent ?? 0),
        ]);
    }

    /**
     * Show a single order for the authenticated customer.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $order = Order::select('id', 'user_id', 'status', 'total_amount', 'currency', 'payment_method', 'payment_status', 'paid_at', 'shipping_address', 'created_at')
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
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'order' => $order,
        ]);
    }

    /**
     * Place a new order from checkout.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address_id' => 'required|integer',
            'payment_method' => 'nullable|string|in:COD,STRIPE',
            'loyalty_points_to_use' => 'nullable|integer|min:0',
        ]);

        $paymentMethod = $validated['payment_method'] ?? 'COD';
        $loyaltyPointsToUse = $validated['loyalty_points_to_use'] ?? 0;

        try {
            $order = DB::transaction(function () use ($validated, $request, $paymentMethod, $loyaltyPointsToUse) {
                $user = $request->user();
                $paymentStatus = $paymentMethod == 'STRIPE' ? 'PENDING' : 'UNPAID';
                
                // Validate and calculate loyalty points discount
                $loyaltyDiscount = 0;
                if ($loyaltyPointsToUse > 0) {
                    $loyaltyService = app(\App\Services\LoyaltyService::class);
                    try {
                        $redemptionInfo = $loyaltyService->redeemPoints($user, $loyaltyPointsToUse);
                        $loyaltyDiscount = $redemptionInfo['discount_amount'];
                    } catch (\Exception $e) {
                        throw ValidationException::withMessages([
                            'loyalty_points' => [$e->getMessage()],
                        ]);
                    }
                }

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
                    'payment_method' => $paymentMethod,
                    'payment_status' => $paymentStatus,
                    'stripe_payment_intent_id' => null,
                    'stripe_payment_status' => null,
                    'paid_at' => null,
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

                    $originalUnitPrice = (float) $product->price;
                    $discountPercent = $product->getActiveDiscountPercent();
                    $unitPrice = $discountPercent > 0
                        ? round($originalUnitPrice * (1 - ($discountPercent / 100)), 2)
                        : $originalUnitPrice;
                    $lineTotal = $unitPrice * $cartItem->quantity;

                    $order->items()->create([
                        'product_id' => $product->id,
                        'quantity' => $cartItem->quantity,
                        'unit_price' => $unitPrice,
                        'total_price' => $lineTotal,
                        'original_unit_price' => $originalUnitPrice,
                        'discount_percent' => $discountPercent,
                    ]);

                    $product->decreaseStock($cartItem->quantity);
                    $total += $lineTotal;
                }

                $order->update(['total_amount' => $total]);
                
                // Apply loyalty points discount if any
                if ($loyaltyPointsToUse > 0 && $loyaltyDiscount > 0) {
                    $finalTotal = max(0, $total - $loyaltyDiscount);
                    $order->update([
                        'total_amount' => $finalTotal,
                        'loyalty_points_used' => $loyaltyPointsToUse,
                        'discount_from_points' => $loyaltyDiscount,
                    ]);
                    
                    // Apply the redemption
                    $loyaltyService = app(\App\Services\LoyaltyService::class);
                    $loyaltyService->applyPointsToOrder($user, $loyaltyPointsToUse);
                }

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

            $payment = null;
            if ($paymentMethod === 'STRIPE') {
                try {
                    $payment = $this->createStripePaymentIntent($order);
                } catch (\Exception $e) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Failed to initialize payment.',
                        'error' => $e->getMessage(),
                    ], 500);
                }
            }

            return response()->json([
                'status' => 'success',
                'order' => $order,
                'payment' => $payment,
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
     * Return Stripe publishable key for checkout.
     */
    public function stripeConfig(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'publishable_key' => config('services.stripe.publishable'),
        ]);
    }

    /**
     * Confirm a Stripe payment and update the order.
     */
    public function confirmStripePayment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_intent_id' => 'required|string',
        ]);

        $order = Order::with(['items.product', 'user'])
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($order->payment_method !== 'STRIPE') {
            return response()->json([
                'status' => 'error',
                'message' => 'Order is not configured for Stripe payments.',
            ], 400);
        }

        $secret = config('services.stripe.secret');
        if (!$secret) {
            return response()->json([
                'status' => 'error',
                'message' => 'Stripe is not configured.',
            ], 500);
        }

        $intentId = $validated['payment_intent_id'];
        if ($order->stripe_payment_intent_id && $order->stripe_payment_intent_id !== $intentId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Payment intent does not match this order.',
            ], 422);
        }

        $response = Http::withToken($secret)
            ->get("https://api.stripe.com/v1/payment_intents/{$intentId}");

        if (!$response->successful()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to verify payment with Stripe.',
            ], 502);
        }

        $intent = $response->json();
        $stripeStatus = $intent['status'] ?? null;

        $updates = [
            'stripe_payment_intent_id' => $intent['id'] ?? $intentId,
            'stripe_payment_status' => $stripeStatus,
        ];

        if ($stripeStatus === 'succeeded') {
            $updates['payment_status'] = 'PAID';
            $updates['status'] = 'PAID';
            $updates['paid_at'] = now();
        } elseif (in_array($stripeStatus, ['processing', 'requires_capture'], true)) {
            $updates['payment_status'] = 'PENDING';
        } else {
            $updates['payment_status'] = 'FAILED';
        }

        $order->update($updates);

        return response()->json([
            'status' => 'success',
            'order' => $order->fresh(['items.product', 'user']),
        ]);
    }

    /**
     * Create (or re-create) a Stripe payment intent for an existing order.
     */
    public function createStripePayment(Request $request, int $id): JsonResponse
    {
        $order = Order::with(['items.product', 'user'])
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($order->payment_method !== 'STRIPE') {
            return response()->json([
                'status' => 'error',
                'message' => 'Order is not configured for Stripe payments.',
            ], 400);
        }

        if ($order->payment_status === 'PAID') {
            return response()->json([
                'status' => 'error',
                'message' => 'Order is already paid.',
            ], 400);
        }

        try {
            $payment = $this->createStripePaymentIntent($order);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to initialize payment.',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'status' => 'success',
            'order' => $order->fresh(['items.product', 'user']),
            'payment' => $payment,
        ]);
    }

    /**
     * Create a Stripe payment intent for an order.
     */
    private function createStripePaymentIntent(Order $order): array
    {
        $secret = config('services.stripe.secret');
        if (!$secret) {
            throw new \RuntimeException('Stripe secret key not configured.');
        }

        $amountCents = (int) round(((float) $order->total_amount) * 100);
        $currency = strtolower($order->currency ?: 'usd');

        $response = Http::withToken($secret)
            ->asForm()
            ->post('https://api.stripe.com/v1/payment_intents', [
                'amount' => $amountCents,
                'currency' => $currency,
                'payment_method_types[]' => 'card',
                'metadata[order_id]' => (string) $order->id,
                'description' => 'ShopMart order ' . $this->formatOrderLabel($order),
            ]);

        if (!$response->successful()) {
            $order->update(['payment_status' => 'FAILED']);
            $message = data_get($response->json(), 'error.message', 'Failed to create Stripe payment intent.');
            throw new \RuntimeException($message);
        }

        $intent = $response->json();

        $order->update([
            'stripe_payment_intent_id' => $intent['id'] ?? null,
            'stripe_payment_status' => $intent['status'] ?? null,
            'payment_status' => $order->payment_status === 'PAID' ? 'PAID' : 'PENDING',
        ]);

        return [
            'provider' => 'stripe',
            'payment_intent_id' => $intent['id'] ?? null,
            'client_secret' => $intent['client_secret'] ?? null,
            'status' => $intent['status'] ?? null,
        ];
    }

    private function formatOrderLabel(Order $order): string
    {
        return sprintf('#ORD-%05d', $order->id);
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
     * Delete a cancelled order (admin).
     */
    public function adminDestroy(int $id): JsonResponse
    {
        try {
            $order = Order::findOrFail($id);

            if ($order->status !== 'CANCELLED') {
                throw ValidationException::withMessages([
                    'status' => ['Only cancelled orders can be deleted.'],
                ]);
            }

            DB::transaction(function () use ($order) {
                $order->delete();
            });

            return response()->json([
                'status' => 'success',
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete order',
                'error' => $e->getMessage(),
            ], 500);
        }
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
        $previousStatus = $order->status;
        $order->status = $validated['status'];
        $isCodPayment = $order->payment_method === 'COD' || $order->payment_method === null;

        if ($isCodPayment) {
            if ($validated['status'] === 'DELIVERED') {
                if ($order->payment_method === null) {
                    $order->payment_method = 'COD';
                }
                $order->payment_status = 'PAID';
                if (!$order->paid_at) {
                    $order->paid_at = now();
                }
            } elseif ($validated['status'] === 'CANCELLED') {
                $order->payment_status = 'FAILED';
                $order->paid_at = null;
            } else {
                $order->payment_status = 'UNPAID';
                $order->paid_at = null;
            }
        } elseif ($validated['status'] === 'CANCELLED' && $order->payment_status !== 'PAID') {
            $order->payment_status = 'FAILED';
        }
        $order->save();

        $statusChanged = $previousStatus !== $order->status;

        if ($statusChanged && in_array($order->status, ['SHIPPED', 'DELIVERED', 'CANCELLED'], true)) {
            $orderLabel = sprintf('#ORD-%05d', $order->id);
            $statusLabel = $order->status === 'SHIPPED'
                ? 'shipped'
                : ($order->status === 'DELIVERED' ? 'delivered' : 'cancelled');
            $title = $order->status === 'SHIPPED'
                ? 'Order shipped'
                : ($order->status === 'DELIVERED' ? 'Order delivered' : 'Order cancelled');
            $type = $order->status === 'SHIPPED'
                ? 'ORDER_SHIPPED'
                : ($order->status === 'DELIVERED' ? 'ORDER_DELIVERED' : 'ORDER_CANCELLED');

            CustomerNotification::create([
                'user_id' => $order->user_id,
                'order_id' => $order->id,
                'type' => $type,
                'title' => $title,
                'message' => "Your order {$orderLabel} has been {$statusLabel}.",
                'is_read' => false,
            ]);
        }

        if ($statusChanged && $order->status === 'SHIPPED') {
            if ($order->user && $order->user->email) {
                Mail::to($order->user->email)->queue(new OrderShipped($order));
            }
        }
        if ($statusChanged && $order->status === 'DELIVERED') {
            if ($order->user && $order->user->email) {
                Mail::to($order->user->email)->queue(new OrderDelivered($order));
            }
            
            // Award loyalty points when order is delivered
            if ($order->loyalty_points_earned == 0) {
                $loyaltyService = app(\App\Services\LoyaltyService::class);
                $loyaltyService->awardPoints($order->user, $order);
            }
        }

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

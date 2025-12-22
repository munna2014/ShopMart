<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
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
        $orders = Order::with(['items.product'])
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
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|distinct',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            $order = DB::transaction(function () use ($validated, $request) {
                $user = $request->user();

                $address = UserAddress::where('user_id', $user->id)
                    ->where('id', $validated['address_id'])
                    ->firstOrFail();

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

                foreach ($validated['items'] as $item) {
                    $product = Product::where('id', $item['product_id'])
                        ->lockForUpdate()
                        ->firstOrFail();

                    if ($product->stock_quantity < $item['quantity']) {
                        throw ValidationException::withMessages([
                            'items' => ["Insufficient stock for {$product->name}."],
                        ]);
                    }

                    $unitPrice = (float) $product->price;
                    $lineTotal = $unitPrice * $item['quantity'];

                    $order->items()->create([
                        'product_id' => $product->id,
                        'quantity' => $item['quantity'],
                        'unit_price' => $unitPrice,
                        'total_price' => $lineTotal,
                    ]);

                    $product->decreaseStock($item['quantity']);
                    $total += $lineTotal;
                }

                $order->update(['total_amount' => $total]);

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

        return response()->json([
            'status' => 'success',
            'order' => $order,
        ]);
    }
}

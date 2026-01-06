<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    /**
     * Get the active cart for the authenticated user.
     */
    public function show(Request $request): JsonResponse
    {
        $cart = $this->getOrCreateCart($request->user()->id);
        $cart->load([
            'items' => function ($query) {
                $query->select('id', 'cart_id', 'product_id', 'quantity', 'unit_price')
                    ->with([
                        'product' => function ($productQuery) {
                            $productQuery->select(
                                'id',
                                'name',
                                'price',
                                'image_url',
                                'discount_percent',
                                'discount_starts_at',
                                'discount_ends_at'
                            );
                        },
                    ]);
            },
        ]);

        return response()->json([
            'status' => 'success',
            'cart' => $cart,
        ]);
    }

    /**
     * Add an item to cart or increase quantity.
     */
    public function addItem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
        ]);

        $quantity = $validated['quantity'] ?? 1;
        $cart = $this->getOrCreateCart($request->user()->id);
        $product = Product::findOrFail($validated['product_id']);

        $cartItem = $cart->addItem($product, $quantity);

        return response()->json([
            'status' => 'success',
            'item' => $cartItem->load('product'),
        ], 201);
    }

    /**
     * Update item quantity.
     */
    public function updateItem(Request $request, int $productId): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:0',
        ]);

        $cart = $this->getOrCreateCart($request->user()->id);
        $item = $cart->items()->where('product_id', $productId)->first();

        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'Item not found in cart',
            ], 404);
        }

        $item->updateQuantity($validated['quantity']);

        return response()->json([
            'status' => 'success',
        ]);
    }

    /**
     * Remove an item from cart.
     */
    public function removeItem(Request $request, int $productId): JsonResponse
    {
        $cart = $this->getOrCreateCart($request->user()->id);
        $cart->removeItem($productId);

        return response()->json([
            'status' => 'success',
        ]);
    }

    /**
     * Clear cart items.
     */
    public function clear(Request $request): JsonResponse
    {
        $cart = $this->getOrCreateCart($request->user()->id);
        $cart->clear();

        return response()->json([
            'status' => 'success',
        ]);
    }

    private function getOrCreateCart(int $userId): Cart
    {
        $cart = Cart::active()->where('user_id', $userId)->first();
        if ($cart) {
            return $cart;
        }

        return Cart::create([
            'user_id' => $userId,
            'status' => 'ACTIVE',
        ]);
    }
}

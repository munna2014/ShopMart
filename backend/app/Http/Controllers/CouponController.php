<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CouponController extends Controller
{
    public function activeCoupons(Request $request): JsonResponse
    {
        $user = $request->user();
        $cart = Cart::active()
            ->where('user_id', $user->id)
            ->with('items.product')
            ->first();

        $subtotal = 0;
        if ($cart && $cart->items->isNotEmpty()) {
            $subtotal = $this->calculateCartSubtotal($cart);
        }

        $now = now();
        $coupons = Coupon::where('is_active', true)
            ->where(function ($query) use ($now) {
                $query->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', $now);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        $usedCouponIds = Order::where('user_id', $user->id)
            ->whereNotNull('coupon_id')
            ->pluck('coupon_id')
            ->unique()
            ->all();

        $usedCodes = Order::where('user_id', $user->id)
            ->whereNull('coupon_id')
            ->whereNotNull('coupon_code')
            ->pluck('coupon_code')
            ->map(fn ($code) => strtoupper($code))
            ->unique()
            ->all();

        $couponsData = $coupons->map(function (Coupon $coupon) use ($subtotal, $usedCouponIds, $usedCodes) {
            $minimum = (float) $coupon->min_order_amount;
            $used = in_array($coupon->id, $usedCouponIds, true)
                || in_array($coupon->code, $usedCodes, true);
            $limitReached = $coupon->usage_limit !== null
                && $coupon->used_count >= $coupon->usage_limit;
            $meetsMinimum = $subtotal >= $minimum;
            $eligible = !$used && !$limitReached && $meetsMinimum;
            $status = $eligible ? 'eligible' : ($used ? 'used' : 'not_eligible');
            $statusLabel = $eligible ? 'Eligible' : ($used ? 'Used' : 'Not eligible');
            $reason = null;

            if ($used) {
                $reason = 'You have already used this coupon.';
            } elseif ($limitReached) {
                $reason = 'Coupon usage limit reached.';
            } elseif (!$meetsMinimum) {
                $formattedMinimum = number_format($minimum, 2);
                $reason = "Minimum order of \${$formattedMinimum} required.";
            }

            return [
                'id' => $coupon->id,
                'code' => $coupon->code,
                'discount_percent' => (float) $coupon->discount_percent,
                'min_order_amount' => $minimum,
                'starts_at' => $coupon->starts_at ? $coupon->starts_at->toDateString() : null,
                'ends_at' => $coupon->ends_at ? $coupon->ends_at->toDateString() : null,
                'usage_limit' => $coupon->usage_limit,
                'used_count' => (int) $coupon->used_count,
                'eligible' => $eligible,
                'status' => $status,
                'status_label' => $statusLabel,
                'reason' => $reason,
                'min_order_remaining' => $meetsMinimum
                    ? 0
                    : max(0, round($minimum - $subtotal, 2)),
            ];
        })->values();

        $usedOrders = Order::where('user_id', $user->id)
            ->whereNotNull('coupon_code')
            ->orderBy('created_at', 'desc')
            ->get([
                'coupon_id',
                'coupon_code',
                'coupon_discount_percent',
                'created_at',
            ]);

        $usedCouponIdsFromOrders = $usedOrders->pluck('coupon_id')->filter()->unique()->values()->all();
        $couponDetails = Coupon::whereIn('id', $usedCouponIdsFromOrders)->get()->keyBy('id');

        $usedCoupons = $usedOrders
            ->groupBy(function ($order) {
                if ($order->coupon_id) {
                    return 'id:' . $order->coupon_id;
                }
                return 'code:' . strtoupper((string) $order->coupon_code);
            })
            ->map(function ($orders) use ($couponDetails) {
                $order = $orders->first();
                $coupon = $order->coupon_id ? $couponDetails->get($order->coupon_id) : null;
                $code = $coupon?->code ?? strtoupper((string) $order->coupon_code);
                $discountPercent = $coupon ? (float) $coupon->discount_percent : (float) $order->coupon_discount_percent;
                $minOrderAmount = $coupon ? (float) $coupon->min_order_amount : null;
                $startsAt = $coupon && $coupon->starts_at ? $coupon->starts_at->toDateString() : null;
                $endsAt = $coupon && $coupon->ends_at ? $coupon->ends_at->toDateString() : null;
                $usedAt = $order->created_at ? $order->created_at->toDateString() : null;

                return [
                    'id' => $coupon?->id,
                    'code' => $code,
                    'discount_percent' => $discountPercent,
                    'min_order_amount' => $minOrderAmount,
                    'starts_at' => $startsAt,
                    'ends_at' => $endsAt,
                    'used_at' => $usedAt,
                    'times_used' => $orders->count(),
                    'status' => 'used',
                    'status_label' => 'Used',
                ];
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'coupons' => $couponsData,
            'used_coupons' => $usedCoupons,
            'cart_subtotal' => $subtotal,
        ]);
    }

    public function validateCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50',
        ]);

        $code = $this->normalizeCode($validated['code']);
        $coupon = Coupon::whereRaw('UPPER(code) = ?', [$code])->first();

        if (!$coupon) {
            throw ValidationException::withMessages([
                'code' => ['Invalid coupon code.'],
            ]);
        }

        $cart = Cart::active()
            ->where('user_id', $request->user()->id)
            ->with('items.product')
            ->first();

        if (!$cart || $cart->items->isEmpty()) {
            throw ValidationException::withMessages([
                'code' => ['Cart is empty.'],
            ]);
        }

        $subtotal = $this->calculateCartSubtotal($cart);
        $this->assertCouponIsValid($coupon, $subtotal);
        $this->assertCouponNotUsedByUser($coupon, $request->user()->id);

        $discountAmount = round($subtotal * ((float) $coupon->discount_percent / 100), 2);
        $total = max(0, $subtotal - $discountAmount);

        return response()->json([
            'status' => 'success',
            'data' => [
                'coupon_id' => $coupon->id,
                'code' => $coupon->code,
                'discount_percent' => (float) $coupon->discount_percent,
                'min_order_amount' => (float) $coupon->min_order_amount,
                'discount_amount' => $discountAmount,
                'subtotal' => $subtotal,
                'total' => $total,
            ],
        ]);
    }

    public function adminIndex(): JsonResponse
    {
        $coupons = Coupon::orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'coupons' => $coupons,
        ]);
    }

    public function adminStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'discount_percent' => 'required|numeric|min:0.01|max:100',
            'min_order_amount' => 'required|numeric|min:0',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after_or_equal:starts_at',
            'is_active' => 'nullable|boolean',
            'usage_limit' => 'nullable|integer|min:1',
        ]);

        $code = $this->normalizeCode($validated['code']);
        if (Coupon::whereRaw('UPPER(code) = ?', [$code])->exists()) {
            throw ValidationException::withMessages([
                'code' => ['Coupon code already exists.'],
            ]);
        }

        $coupon = Coupon::create([
            'code' => $code,
            'discount_percent' => $validated['discount_percent'],
            'min_order_amount' => $validated['min_order_amount'],
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'],
            'is_active' => $validated['is_active'] ?? true,
            'usage_limit' => $validated['usage_limit'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'coupon' => $coupon,
        ], 201);
    }

    public function adminUpdate(Request $request, Coupon $coupon): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'sometimes|string|max:50',
            'discount_percent' => 'sometimes|numeric|min:0.01|max:100',
            'min_order_amount' => 'sometimes|numeric|min:0',
            'starts_at' => 'sometimes|date',
            'ends_at' => 'sometimes|date',
            'is_active' => 'sometimes|boolean',
        ]);

        $updates = [];
        if (array_key_exists('code', $validated)) {
            $code = $this->normalizeCode($validated['code']);
            $exists = Coupon::whereRaw('UPPER(code) = ?', [$code])
                ->where('id', '!=', $coupon->id)
                ->exists();
            if ($exists) {
                throw ValidationException::withMessages([
                    'code' => ['Coupon code already exists.'],
                ]);
            }
            $updates['code'] = $code;
        }

        if (array_key_exists('discount_percent', $validated)) {
            $updates['discount_percent'] = $validated['discount_percent'];
        }

        if (array_key_exists('min_order_amount', $validated)) {
            $updates['min_order_amount'] = $validated['min_order_amount'];
        }

        if (array_key_exists('starts_at', $validated)) {
            $updates['starts_at'] = $validated['starts_at'];
        }

        if (array_key_exists('ends_at', $validated)) {
            $updates['ends_at'] = $validated['ends_at'];
        }

        if (array_key_exists('is_active', $validated)) {
            $updates['is_active'] = $validated['is_active'];
        }

        $startsAt = $updates['starts_at'] ?? $coupon->starts_at;
        $endsAt = $updates['ends_at'] ?? $coupon->ends_at;
        $startsAtValue = $startsAt ? \Carbon\Carbon::parse($startsAt) : null;
        $endsAtValue = $endsAt ? \Carbon\Carbon::parse($endsAt) : null;
        if ($startsAtValue && $endsAtValue && $endsAtValue->lt($startsAtValue)) {
            throw ValidationException::withMessages([
                'ends_at' => ['End date must be on or after start date.'],
            ]);
        }

        if (!empty($updates)) {
            $coupon->update($updates);
        }

        return response()->json([
            'status' => 'success',
            'coupon' => $coupon,
        ]);
    }

    private function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    private function assertCouponIsValid(Coupon $coupon, float $subtotal): void
    {
        if (!$coupon->is_active) {
            throw ValidationException::withMessages([
                'code' => ['This coupon is not active.'],
            ]);
        }

        $now = now();
        if ($coupon->starts_at && $now->lt($coupon->starts_at)) {
            throw ValidationException::withMessages([
                'code' => ['This coupon is not active yet.'],
            ]);
        }

        if ($coupon->ends_at && $now->gt($coupon->ends_at)) {
            throw ValidationException::withMessages([
                'code' => ['This coupon has expired.'],
            ]);
        }

        if ($subtotal < (float) $coupon->min_order_amount) {
            $minimum = number_format((float) $coupon->min_order_amount, 2);
            throw ValidationException::withMessages([
                'code' => ["Minimum order of \${$minimum} required."],
            ]);
        }

        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            throw ValidationException::withMessages([
                'code' => ['This coupon has reached its usage limit.'],
            ]);
        }
    }

    private function assertCouponNotUsedByUser(Coupon $coupon, int $userId): void
    {
        $alreadyUsed = Order::where('user_id', $userId)
            ->where(function ($query) use ($coupon) {
                $query->where('coupon_id', $coupon->id)
                    ->orWhere(function ($inner) use ($coupon) {
                        $inner->whereNull('coupon_id')
                            ->whereRaw('UPPER(coupon_code) = ?', [$coupon->code]);
                    });
            })
            ->exists();

        if ($alreadyUsed) {
            throw ValidationException::withMessages([
                'code' => ['You have already used this coupon.'],
            ]);
        }
    }

    private function calculateCartSubtotal(Cart $cart): float
    {
        $subtotal = 0;
        foreach ($cart->items as $cartItem) {
            $product = $cartItem->product;
            if (!$product) {
                continue;
            }
            $originalUnitPrice = (float) $product->price;
            $discountPercent = $product->getActiveDiscountPercent();
            $unitPrice = $discountPercent > 0
                ? round($originalUnitPrice * (1 - ($discountPercent / 100)), 2)
                : $originalUnitPrice;
            $subtotal += $unitPrice * $cartItem->quantity;
        }

        return round($subtotal, 2);
    }
}

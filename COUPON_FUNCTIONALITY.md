# Coupon Functionality

## Scope
This document covers only coupon features: public and admin APIs, backend validation/application, and the related frontend UI flows.

## Data model
### Coupons table
- Migration: `backend/database/migrations/2026_01_15_000001_create_coupons_table.php`
- Fields: `code` (unique), `discount_percent`, `min_order_amount`, `starts_at`, `ends_at`, `is_active`, `usage_limit`, `used_count`, `created_by`.
- Index: `is_active`, `starts_at`, `ends_at`.

### Orders table coupon fields
- Migration: `backend/database/migrations/2026_01_15_000002_add_coupon_fields_to_orders_table.php`
- Fields: `coupon_id`, `coupon_code`, `coupon_discount_percent`, `coupon_discount_amount`.

### Models
- Coupon model: `backend/app/Models/Coupon.php` (fillable fields and casts for dates/decimals).
- Order model: `backend/app/Models/Order.php` (stores coupon metadata on the order).

## APIs
### Customer APIs
#### GET `/coupons/active`
- Route: `backend/routes/user/coupons.php`
- Description: Lists active coupons and the current user's used coupons, plus the cart subtotal used for eligibility.
- Eligibility rules are computed server-side using cart subtotal after product-level discounts and checks for active dates, usage limit, and prior use.

```php
Route::get('/coupons/active', [CouponController::class, 'activeCoupons']);
```

Key logic (backend): `backend/app/Http/Controllers/CouponController.php`
```php
$coupons = Coupon::where('is_active', true)
    ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
    ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', $now))
    ->orderBy('created_at', 'desc')
    ->get();

$eligible = !$used && !$limitReached && $meetsMinimum;
```

Response payload fields include:
- `coupons`: each coupon includes `eligible`, `status`, `status_label`, `reason`, and `min_order_remaining`.
- `used_coupons`: grouped list of coupons already used by the customer.
- `cart_subtotal`: subtotal used to calculate eligibility.

#### POST `/coupons/validate`
- Route: `backend/routes/user/coupons.php`
- Request body: `{ "code": "SUMMER10" }`
- Description: Validates a coupon against the current cart and returns discount math for the UI.

```php
Route::post('/coupons/validate', [CouponController::class, 'validateCoupon']);
```

Key logic (backend): `backend/app/Http/Controllers/CouponController.php`
```php
$code = $this->normalizeCode($validated['code']);
$subtotal = $this->calculateCartSubtotal($cart);
$this->assertCouponIsValid($coupon, $subtotal);
$this->assertCouponNotUsedByUser($coupon, $request->user()->id);
$discountAmount = round($subtotal * ((float) $coupon->discount_percent / 100), 2);
```

Response data:
- `coupon_id`, `code`, `discount_percent`, `min_order_amount`
- `discount_amount`, `subtotal`, `total`

### Admin APIs
#### GET `/admin/coupons`
- Route: `backend/routes/admin/coupons.php`
- Description: Returns all coupons for the admin dashboard.

#### POST `/admin/coupons`
- Route: `backend/routes/admin/coupons.php`
- Description: Creates a new coupon. Normalizes `code` to uppercase and enforces uniqueness.
- Required fields: `code`, `discount_percent`, `min_order_amount`, `starts_at`, `ends_at`.
- Optional fields: `is_active`, `usage_limit`.

#### PATCH `/admin/coupons/{coupon}`
- Route: `backend/routes/admin/coupons.php`
- Description: Updates coupon fields and enforces unique code + valid date range.

```php
Route::get('/admin/coupons', [CouponController::class, 'adminIndex']);
Route::post('/admin/coupons', [CouponController::class, 'adminStore']);
Route::patch('/admin/coupons/{coupon}', [CouponController::class, 'adminUpdate']);
```

## Backend application flow
### Apply coupon during checkout
- File: `backend/app/Http/Controllers/OrderController.php`
- The checkout endpoint accepts `coupon_code` and re-validates all coupon constraints in the order transaction.
- If valid, it stores `coupon_id`, `coupon_code`, `coupon_discount_percent`, and `coupon_discount_amount` on the order and increments `used_count` on the coupon.

```php
$couponCode = trim($validated['coupon_code'] ?? '');
// ... validate coupon
$couponDiscount = round($subtotal * ((float) $coupon->discount_percent / 100), 2);
$order->update([
    'coupon_id' => $coupon->id,
    'coupon_code' => $coupon->code,
    'coupon_discount_percent' => $coupon->discount_percent,
    'coupon_discount_amount' => $couponDiscount,
    'total_amount' => $total,
]);
$coupon->increment('used_count');
```

### Cart subtotal for coupon eligibility
- File: `backend/app/Http/Controllers/CouponController.php`
- Subtotal uses product-level discounts so coupons apply on top of discounted pricing.

```php
$discountPercent = $product->getActiveDiscountPercent();
$unitPrice = $discountPercent > 0
    ? round($originalUnitPrice * (1 - ($discountPercent / 100)), 2)
    : $originalUnitPrice;
```

## Frontend
### Admin dashboard (create/edit/toggle)
- File: `admin/src/components/AdminDashboard.jsx`
- Fetches coupon list, validates form fields, and calls the admin APIs.

```js
const response = await api.get('/admin/coupons');
await api.post('/admin/coupons', { code, discount_percent, min_order_amount, starts_at, ends_at, is_active });
await api.patch(`/admin/coupons/${couponId}`, { code, discount_percent, min_order_amount, starts_at, ends_at, is_active });
```

### Customer "My Coupons" tab
- File: `frontend/app/components/customer/CustomerView.js`
- Loads active/used coupons and displays eligibility based on API response.

```js
const response = await api.get('/coupons/active');
setCoupons(response.data.coupons || []);
setUsedCoupons(response.data.used_coupons || []);
```

### Checkout coupon apply
- File: `frontend/app/components/customer/checkout/page.js`
- Fetches active coupons, validates a code, calculates totals with `couponInfo`, and sends the code during order placement.

```js
const response = await api.post('/coupons/validate', { code: trimmedCode });
setCouponInfo(response.data.data);

await api.post('/orders', {
  address_id: selectedAddressId,
  payment_method: paymentMethod,
  loyalty_points_to_use: loyaltyPoints.toUse,
  coupon_code: couponInfo?.code || null,
});
```

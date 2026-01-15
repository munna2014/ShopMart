# Coupon and Loyalty Rewards Workflows

This document explains the functional workflows for Coupons and Loyalty Rewards in ShopMart, covering API calls, backend validation, and frontend flow.

## Coupon Workflow

### 1) Admin creates and manages coupons
- Admin UI: `admin/src/components/AdminDashboard.jsx`
- API routes: `backend/routes/admin/coupons.php`

Workflow:
1. Admin opens Coupons tab and submits coupon form.
2. UI calls `POST /admin/coupons` with `code`, `discount_percent`, `min_order_amount`, `starts_at`, `ends_at`, `is_active`.
3. Backend normalizes code to uppercase, validates uniqueness and date range.
4. Coupon is stored in `coupons` table.

Key backend logic:
- `backend/app/Http/Controllers/CouponController.php` (`adminStore`, `adminUpdate`, `adminIndex`)
- Data model: `backend/app/Models/Coupon.php`
- Migration: `backend/database/migrations/2026_01_15_000001_create_coupons_table.php`

### 2) Customer views available coupons
- Customer UI: `frontend/app/components/customer/CustomerView.js`
- API route: `GET /coupons/active` (`backend/routes/user/coupons.php`)

Workflow:
1. Customer opens "My Coupons" tab.
2. UI calls `GET /coupons/active`.
3. Backend computes cart subtotal (after product-level discounts) and eligibility.
4. Response returns active coupons, used coupons, and subtotal.

Backend logic:
- `backend/app/Http/Controllers/CouponController.php::activeCoupons`
- Eligibility checks: active dates, `is_active`, `usage_limit`, prior use, and `min_order_amount`.

### 3) Customer applies a coupon at checkout
- Checkout UI: `frontend/app/components/customer/checkout/page.js`
- API route: `POST /coupons/validate` (`backend/routes/user/coupons.php`)

Workflow:
1. Customer enters coupon code or selects from available list.
2. UI calls `POST /coupons/validate` with `{ code }`.
3. Backend validates coupon, checks cart subtotal, and returns discount preview.
4. UI displays the applied discount in order totals.

Backend logic:
- `backend/app/Http/Controllers/CouponController.php::validateCoupon`

### 4) Coupon is applied to the order
- Order API: `POST /orders` (`backend/app/Http/Controllers/OrderController.php`)

Workflow:
1. Checkout submits the order with `coupon_code`.
2. Backend re-validates coupon inside the order transaction.
3. If valid, it updates order fields and increments `used_count`.

Order fields:
- `coupon_id`, `coupon_code`, `coupon_discount_percent`, `coupon_discount_amount`.
- Migration: `backend/database/migrations/2026_01_15_000002_add_coupon_fields_to_orders_table.php`

## Loyalty Rewards Workflow

### 1) Customer views loyalty balance and history
- Customer UI: `frontend/app/components/customer/CustomerView.js`
- API routes: `backend/routes/user/loyalty.php`
  - `GET /loyalty/balance`
  - `GET /loyalty/history?limit=50`

Workflow:
1. Customer opens "Loyalty Rewards" tab.
2. UI calls balance and history endpoints.
3. Backend returns points totals, redeemable discount, and transaction history.

Backend logic:
- `backend/app/Http/Controllers/LoyaltyController.php`
- Service: `backend/app/Services/LoyaltyService.php`
- Data models: `backend/app/Models/LoyaltyPoint.php`, `backend/app/Models/LoyaltyTransaction.php`

### 2) Customer redeems points during checkout
- Checkout UI: `frontend/app/components/customer/checkout/page.js`
- API route: `POST /loyalty/calculate-redemption`

Workflow:
1. Customer enters points (multiples of 100).
2. UI calls `POST /loyalty/calculate-redemption` with `{ points }`.
3. Backend validates points and returns discount preview.
4. UI shows loyalty discount in totals.

Backend logic:
- `backend/app/Http/Controllers/LoyaltyController.php::calculateRedemption`

### 3) Loyalty discount is applied to the order
- Order API: `POST /orders` (`backend/app/Http/Controllers/OrderController.php`)

Workflow:
1. Checkout submits `loyalty_points_to_use` with the order.
2. Backend redeems points in the order transaction.
3. Discount is applied to the order total, and points are deducted.

Order fields:
- `loyalty_points_used`, `loyalty_points_earned`, `discount_from_points`.
- Migration: `backend/database/migrations/2026_01_14_130236_add_loyalty_points_to_orders_table.php`

### 4) Points are awarded after delivery
- Order status updates: `backend/app/Http/Controllers/OrderController.php`

Workflow:
1. When an order is marked `DELIVERED`, the backend awards points.
2. Loyalty transaction is created and user balance is updated.

Backend logic:
- `backend/app/Http/Controllers/OrderController.php::updateStatus`
- `backend/app/Services/LoyaltyService.php::awardPoints`

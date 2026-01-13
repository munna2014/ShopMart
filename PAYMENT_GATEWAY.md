# Payment Gateway (Stripe + Cash on Delivery)

## Overview
This project supports two payment methods: cash on delivery (COD) and online card payments via Stripe.

## Database Changes
New columns added to the `orders` table:
- `payment_method` (COD | STRIPE)
- `payment_status` (UNPAID | PENDING | PAID | FAILED)
- `stripe_payment_intent_id` (nullable)
- `stripe_payment_status` (nullable)
- `paid_at` (nullable)

## Backend Configuration
Add these keys to `backend/.env` (do not commit secrets):
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`

## API Endpoints
### GET `/api/payments/stripe/config`
Returns the Stripe publishable key for the frontend.

Response:
```json
{
  "status": "success",
  "publishable_key": "pk_test_..."
}
```

### POST `/api/orders`
Creates an order and optionally initializes a Stripe PaymentIntent.

Request:
```json
{
  "address_id": 12,
  "payment_method": "COD"
}
```

For Stripe payments, set `payment_method` to `STRIPE`.

Stripe response payload includes a `payment` object:
```json
{
  "status": "success",
  "order": { ... },
  "payment": {
    "provider": "stripe",
    "payment_intent_id": "pi_...",
    "client_secret": "pi_..._secret_...",
    "status": "requires_payment_method"
  }
}
```

### POST `/api/orders/{id}/stripe-confirm`
Verifies the PaymentIntent with Stripe and updates the order payment status.

Request:
```json
{
  "payment_intent_id": "pi_..."
}
```

### POST `/api/orders/{id}/stripe-pay`
Creates or refreshes a Stripe PaymentIntent for an existing Stripe order that is still unpaid.

Response:
```json
{
  "status": "success",
  "order": { ... },
  "payment": {
    "provider": "stripe",
    "payment_intent_id": "pi_...",
    "client_secret": "pi_..._secret_...",
    "status": "requires_payment_method"
  }
}
```

## Backend Flow
- `OrderController@store` creates the order with `payment_method` and `payment_status`.
- For Stripe, it creates a PaymentIntent and returns the client secret.
- `OrderController@confirmStripePayment` verifies the PaymentIntent status and updates
  `payment_status`, `stripe_payment_status`, `paid_at`, and order `status`.

## Frontend Flow
- Checkout page lets the customer choose COD or Stripe.
- COD: calls `POST /api/orders` with `payment_method: COD` and shows success.
- Stripe: loads Stripe.js, creates a card element, calls `POST /api/orders` with
  `payment_method: STRIPE`, then confirms payment with `stripe.confirmCardPayment`.
- After success, it calls `/api/orders/{id}/stripe-confirm` to mark the order as paid.
- If an order is still pending, the order details page lets the customer enter card details
  and uses `/api/orders/{id}/stripe-pay` followed by `/api/orders/{id}/stripe-confirm`.

## Admin and Customer Views
- Admin Orders tab shows payment method and payment status.
- Customer Order Details shows payment method, status, and paid date.

## Notes
- For production, add Stripe webhooks to handle async payment updates.
- Keep Stripe secret keys in environment variables only.

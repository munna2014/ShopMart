# Loyalty Rewards System Documentation

## Overview
The Loyalty Rewards System allows customers to earn points on purchases and redeem them for discounts on future orders.

## System Rules

### Earning Points
- **Rate**: Customers earn 5% of their order amount as loyalty points
- **Calculation**: Points = floor(Order Amount × 0.05)
- **Example**: $100 order = 5 points
- **Trigger**: Points are awarded when order status changes to "DELIVERED"

### Redeeming Points
- **Minimum**: 100 points required for redemption
- **Increment**: Points must be redeemed in multiples of 100
- **Value**: 100 points = $10 discount
- **Usage**: Points can be applied during checkout

## Database Schema

### Tables Created

#### 1. `loyalty_points`
Stores the current points balance for each user.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| user_id | bigint | Foreign key to users table |
| points | integer | Current available points |
| total_earned | decimal(10,2) | Lifetime points earned |
| total_redeemed | decimal(10,2) | Lifetime points redeemed |
| created_at | timestamp | Record creation time |
| updated_at | timestamp | Last update time |

#### 2. `loyalty_transactions`
Tracks all loyalty point transactions (earned, redeemed, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| user_id | bigint | Foreign key to users table |
| order_id | bigint | Foreign key to orders table (nullable) |
| type | enum | Transaction type: earned, redeemed, expired, adjusted |
| points | integer | Points amount (positive for earned, negative for redeemed) |
| order_amount | decimal(10,2) | Order amount if applicable |
| description | text | Transaction description |
| created_at | timestamp | Transaction time |
| updated_at | timestamp | Last update time |

#### 3. `orders` table updates
Added columns to track loyalty points usage in orders.

| Column | Type | Description |
|--------|------|-------------|
| loyalty_points_used | integer | Points used in this order |
| loyalty_points_earned | integer | Points earned from this order |
| discount_from_points | decimal(10,2) | Dollar discount from points |

## API Endpoints

### Customer Endpoints

#### Get Loyalty Balance
```
GET /api/loyalty/balance
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "points": 250,
    "total_earned": 500,
    "total_redeemed": 250,
    "available_discount": 20,
    "can_redeem": true
  }
}
```

#### Get Transaction History
```
GET /api/loyalty/history?limit=50
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": "success",
  "transactions": [
    {
      "id": 1,
      "type": "earned",
      "points": 5,
      "order_id": 123,
      "order_amount": "100.00",
      "description": "Earned 5 points from order #123",
      "created_at": "2026-01-14T10:00:00.000000Z"
    }
  ]
}
```

#### Calculate Redemption Preview
```
POST /api/loyalty/calculate-redemption
Authorization: Bearer {token}
Content-Type: application/json

{
  "points": 200
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "points_to_redeem": 200,
    "discount_amount": 20,
    "remaining_points": 50
  }
}
```

### Checkout with Loyalty Points
```
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "address_id": 1,
  "payment_method": "COD",
  "loyalty_points_to_use": 100
}
```

## Backend Implementation

### Models

#### LoyaltyPoint Model
- Location: `app/Models/LoyaltyPoint.php`
- Methods:
  - `calculatePointsFromAmount(float $amount): int` - Calculate points from order amount
  - `calculateDiscountFromPoints(int $points): float` - Calculate discount from points
  - `canRedeem(int $pointsToRedeem): bool` - Check if redemption is possible

#### LoyaltyTransaction Model
- Location: `app/Models/LoyaltyTransaction.php`
- Tracks all point transactions

### Services

#### LoyaltyService
- Location: `app/Services/LoyaltyService.php`
- Methods:
  - `awardPoints(User $user, Order $order): void` - Award points for completed order
  - `redeemPoints(User $user, int $pointsToRedeem): array` - Preview redemption
  - `applyPointsToOrder(User $user, int $pointsToRedeem): void` - Apply redemption
  - `getBalance(User $user): array` - Get user's point balance
  - `getTransactionHistory(User $user, int $limit): array` - Get transaction history

### Controllers

#### LoyaltyController
- Location: `app/Http/Controllers/LoyaltyController.php`
- Handles all loyalty-related API requests

### Order Integration

#### OrderController Updates
- **Checkout**: Validates and applies loyalty points discount
- **Status Update**: Awards points when order is marked as "DELIVERED"

## Frontend Integration (To Be Implemented)

### Required Components

1. **Loyalty Points Display**
   - Show current balance in customer dashboard
   - Display available discount amount
   - Show "can redeem" status

2. **Checkout Integration**
   - Add loyalty points redemption option
   - Show discount preview
   - Update total amount dynamically

3. **Transaction History**
   - Display earned/redeemed points
   - Show associated orders
   - Filter by transaction type

### Example Frontend Flow

```javascript
// 1. Fetch loyalty balance
const response = await api.get('/loyalty/balance');
const { points, available_discount, can_redeem } = response.data.data;

// 2. Calculate redemption at checkout
const redemption = await api.post('/loyalty/calculate-redemption', {
  points: 100
});
const { discount_amount } = redemption.data.data;

// 3. Place order with points
await api.post('/orders', {
  address_id: 1,
  payment_method: 'COD',
  loyalty_points_to_use: 100
});
```

## Testing the System

### Test Scenario 1: Earning Points
1. Place an order for $100
2. Admin marks order as "DELIVERED"
3. Customer receives 5 loyalty points
4. Check `/api/loyalty/balance` - should show 5 points

### Test Scenario 2: Redeeming Points
1. Customer has 250 points
2. At checkout, apply 200 points
3. Receive $20 discount
4. Order total reduced by $20
5. Remaining balance: 50 points

### Test Scenario 3: Insufficient Points
1. Customer has 50 points
2. Try to redeem 100 points
3. System returns error: "Minimum 100 points required"

## Security Considerations

1. **Transaction Locking**: Uses database locks to prevent race conditions
2. **Validation**: Points must be in multiples of 100
3. **Balance Check**: Verifies sufficient points before redemption
4. **Audit Trail**: All transactions are logged in `loyalty_transactions`

## Future Enhancements

1. **Point Expiration**: Add expiry dates for earned points
2. **Bonus Campaigns**: Special events with multiplied points
3. **Tier System**: Bronze/Silver/Gold tiers with different earning rates
4. **Referral Bonuses**: Award points for referring friends
5. **Birthday Bonuses**: Extra points on customer's birthday

## Maintenance

### Database Cleanup
```sql
-- Remove expired transactions older than 2 years
DELETE FROM loyalty_transactions 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

### Audit Query
```sql
-- Check points balance integrity
SELECT 
  u.id,
  u.email,
  lp.points as current_points,
  SUM(CASE WHEN lt.type = 'earned' THEN lt.points ELSE 0 END) as total_earned,
  SUM(CASE WHEN lt.type = 'redeemed' THEN ABS(lt.points) ELSE 0 END) as total_redeemed
FROM users u
LEFT JOIN loyalty_points lp ON u.id = lp.user_id
LEFT JOIN loyalty_transactions lt ON u.id = lt.user_id
GROUP BY u.id, u.email, lp.points;
```

## Support

For issues or questions about the Loyalty Rewards System:
1. Check transaction history for discrepancies
2. Verify order status is "DELIVERED" for point awards
3. Ensure points are in multiples of 100 for redemption
4. Review `loyalty_transactions` table for audit trail

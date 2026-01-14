# Loyalty Rewards System - Frontend Implementation Guide

## Changes Required

### 1. Update `frontend/app/components/customer/page.js`

**Location**: Line 79-96
**Change**: Update the stats fetching to include loyalty points

```javascript
// REPLACE THIS:
const response = await api.get("/orders/summary");
const stats = {
  totalOrders: response.data.total_orders || 0,
  totalSpent: `$${Number(response.data.total_spent || 0).toFixed(2)}`,
  loyaltyPoints: 0, // TODO: Add loyalty points to API
};

// WITH THIS:
const [ordersResponse, loyaltyResponse] = await Promise.all([
  api.get("/orders/summary"),
  api.get("/loyalty/balance")
]);

const freshStats = {
  totalOrders: ordersResponse.data.total_orders || 0,
  totalSpent: `$${Number(ordersResponse.data.total_spent || 0).toFixed(2)}`,
  loyaltyPoints: loyaltyResponse.data.data?.points || 0,
};
```

Also update the cache storage (around line 90-95):
```javascript
// Update cache
localStorage.setItem(cacheKey, JSON.stringify({
  total_orders: ordersResponse.data.total_orders || 0,
  total_spent: ordersResponse.data.total_spent || 0,
  loyalty_points: loyaltyResponse.data.data?.points || 0,  // ADD THIS LINE
  cached_at: new Date().toISOString(),
}));
```

### 2. Update `frontend/app/components/customer/CustomerView.js`

**Add Loyalty Tab and State**

Add to the VALID_TABS array (around line 16):
```javascript
const VALID_TABS = [
  "profile",
  "orders",
  "notifications",
  "addresses",
  "settings",
  "loyalty",  // ADD THIS
];
```

Add state for loyalty data (around line 60):
```javascript
const [loyaltyBalance, setLoyaltyBalance] = useState({
  points: 0,
  total_earned: 0,
  total_redeemed: 0,
  available_discount: 0,
  can_redeem: false,
});
const [loyaltyTransactions, setLoyaltyTransactions] = useState([]);
const [loyaltyLoading, setLoyaltyLoading] = useState(false);
```

Add fetch function for loyalty data:
```javascript
const fetchLoyaltyData = async () => {
  try {
    setLoyaltyLoading(true);
    const [balanceRes, historyRes] = await Promise.all([
      api.get('/loyalty/balance'),
      api.get('/loyalty/history?limit=50')
    ]);
    
    setLoyaltyBalance(balanceRes.data.data || {
      points: 0,
      total_earned: 0,
      total_redeemed: 0,
      available_discount: 0,
      can_redeem: false,
    });
    
    setLoyaltyTransactions(historyRes.data.transactions || []);
  } catch (error) {
    console.error('Error fetching loyalty data:', error);
  } finally {
    setLoyaltyLoading(false);
  }
};

useEffect(() => {
  if (activeTab === "loyalty") {
    fetchLoyaltyData();
  }
}, [activeTab]);
```

Add Loyalty Tab UI (in the tab content section):
```javascript
{activeTab === "loyalty" && (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-8 text-white">
      <h2 className="text-2xl font-bold mb-2">Loyalty Rewards</h2>
      <p className="text-white/90 mb-6">Earn 5% points on every purchase!</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="text-4xl font-bold mb-2">{loyaltyBalance.points}</div>
          <div className="text-white/80">Available Points</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="text-4xl font-bold mb-2">${loyaltyBalance.available_discount}</div>
          <div className="text-white/80">Available Discount</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="text-4xl font-bold mb-2">{loyaltyBalance.total_earned}</div>
          <div className="text-white/80">Total Earned</div>
        </div>
      </div>
      
      <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
        <p className="text-sm">
          💡 <strong>How it works:</strong> Earn 5% points on every order. 
          Redeem 100 points for $10 off your next purchase!
        </p>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h3>
      
      {loyaltyLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      ) : loyaltyTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">No transactions yet</p>
          <p className="text-sm">Start shopping to earn loyalty points!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {loyaltyTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  transaction.type === 'earned' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {transaction.type === 'earned' ? '+' : '-'}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{transaction.description}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <div className={`text-lg font-bold ${
                transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'earned' ? '+' : ''}{transaction.points} pts
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
```

Add "Loyalty" to the sidebar navigation (around line 1800):
```javascript
<button
  onClick={() => handleTabChange("loyalty")}
  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
    activeTab === "loyalty"
      ? "bg-green-50 text-green-700 font-semibold"
      : "text-gray-700 hover:bg-gray-50"
  }`}
>
  <div className="flex items-center gap-3">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>Loyalty Rewards</span>
  </div>
</button>
```

### 3. Update Checkout Page `frontend/app/components/customer/checkout/page.js`

Add state for loyalty points (around line 30):
```javascript
const [loyaltyPoints, setLoyaltyPoints] = useState({
  available: 0,
  toUse: 0,
  discount: 0,
  canRedeem: false,
});
const [showLoyaltySection, setShowLoyaltySection] = useState(false);
```

Fetch loyalty balance on mount:
```javascript
useEffect(() => {
  const fetchLoyaltyBalance = async () => {
    try {
      const response = await api.get('/loyalty/balance');
      const data = response.data.data;
      setLoyaltyPoints({
        available: data.points || 0,
        toUse: 0,
        discount: 0,
        canRedeem: data.can_redeem || false,
      });
      setShowLoyaltySection(data.points >= 100);
    } catch (error) {
      console.error('Error fetching loyalty balance:', error);
    }
  };

  if (isAuthenticated) {
    fetchLoyaltyBalance();
  }
}, [isAuthenticated]);
```

Add loyalty points redemption handler:
```javascript
const handleLoyaltyPointsChange = async (points) => {
  if (points < 0 || points > loyaltyPoints.available) return;
  if (points > 0 && points % 100 !== 0) {
    alert('Points must be in multiples of 100');
    return;
  }

  try {
    if (points === 0) {
      setLoyaltyPoints(prev => ({ ...prev, toUse: 0, discount: 0 }));
      return;
    }

    const response = await api.post('/loyalty/calculate-redemption', { points });
    const data = response.data.data;
    
    setLoyaltyPoints(prev => ({
      ...prev,
      toUse: points,
      discount: data.discount_amount,
    }));
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to calculate discount');
    setLoyaltyPoints(prev => ({ ...prev, toUse: 0, discount: 0 }));
  }
};
```

Add Loyalty Points UI in checkout form (before payment method section):
```javascript
{showLoyaltySection && (
  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Use Loyalty Points</h3>
        <p className="text-sm text-gray-600">You have {loyaltyPoints.available} points available</p>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold text-green-600">${loyaltyPoints.discount}</div>
        <div className="text-xs text-gray-500">Discount</div>
      </div>
    </div>
    
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Points to use (multiples of 100)
        </label>
        <input
          type="number"
          min="0"
          max={loyaltyPoints.available}
          step="100"
          value={loyaltyPoints.toUse}
          onChange={(e) => handleLoyaltyPointsChange(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Enter points (e.g., 100, 200, 300)"
        />
      </div>
      
      <div className="bg-white rounded-lg p-3 text-sm">
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">100 points =</span>
          <span className="font-semibold">$10 discount</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Your discount:</span>
          <span className="font-bold text-green-600">${loyaltyPoints.discount}</span>
        </div>
      </div>
    </div>
  </div>
)}
```

Update order total calculation:
```javascript
const finalTotal = cartTotal - loyaltyPoints.discount;
```

Update order submission to include loyalty points:
```javascript
const orderData = {
  address_id: selectedAddress.id,
  payment_method: paymentMethod,
  loyalty_points_to_use: loyaltyPoints.toUse,  // ADD THIS
};
```

### 4. Display Earned Points in Order Confirmation

In the order success/confirmation page, add:
```javascript
{order.loyalty_points_earned > 0 && (
  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mt-6">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <div className="text-lg font-bold text-gray-900">
          🎉 You'll earn {order.loyalty_points_earned} loyalty points!
        </div>
        <div className="text-sm text-gray-600">
          Points will be added when your order is delivered
        </div>
      </div>
    </div>
  </div>
)}
```

## Testing Checklist

- [ ] Customer dashboard shows loyalty points balance
- [ ] Loyalty tab displays transaction history
- [ ] Checkout page shows loyalty points redemption option
- [ ] Points calculation works correctly (multiples of 100)
- [ ] Discount is applied to order total
- [ ] Order confirmation shows earned points
- [ ] Points are awarded when order is delivered
- [ ] Transaction history updates after earning/redeeming

## API Endpoints Used

- `GET /api/loyalty/balance` - Get user's loyalty points balance
- `GET /api/loyalty/history` - Get transaction history
- `POST /api/loyalty/calculate-redemption` - Preview redemption discount
- `POST /api/orders` (with `loyalty_points_to_use`) - Place order with points

## Notes

- Points are earned at 5% of order amount
- Points are awarded only when order status is "DELIVERED"
- Minimum 100 points required for redemption
- Points must be redeemed in multiples of 100
- 100 points = $10 discount

# Customer Notifications

## Description
This document summarizes the customer notification system that alerts customers when an admin updates an order status (e.g., shipped or cancelled). It includes database storage, API endpoints, backend hooks, and frontend behavior, along with key code snippets.

## API
- `GET /api/notifications`
  - Returns the latest notifications and unread count for the authenticated customer.
- `PATCH /api/notifications/{id}/read`
  - Marks a single notification as read.
- `PATCH /api/notifications/read-all`
  - Marks all notifications as read for the customer.
- `DELETE /api/notifications/{id}`
  - Deletes a single notification.
- `DELETE /api/notifications`
  - Deletes all notifications for the customer.

## Backend

### Migration
File: `backend/database/migrations/2026_01_07_000002_create_customer_notifications_table.php`

```php
Schema::create('customer_notifications', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
    $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
    $table->string('type', 50);
    $table->string('title', 150);
    $table->text('message');
    $table->boolean('is_read')->default(false);
    $table->timestamp('read_at')->nullable();
    $table->timestamps();
    $table->index(['user_id', 'is_read', 'created_at'], 'idx_customer_notifications_user_read_created');
});
```

### Model
File: `backend/app/Models/CustomerNotification.php`

```php
class CustomerNotification extends Model
{
    protected $fillable = [
        'user_id',
        'order_id',
        'type',
        'title',
        'message',
        'is_read',
        'read_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
```

### Controller
File: `backend/app/Http/Controllers/CustomerNotificationController.php`

```php
public function index(Request $request): JsonResponse
{
    $notifications = CustomerNotification::where('user_id', $request->user()->id)
        ->orderBy('created_at', 'desc')
        ->limit(100)
        ->get();

    $unreadCount = CustomerNotification::where('user_id', $request->user()->id)
        ->where('is_read', false)
        ->count();

    return response()->json([
        'status' => 'success',
        'notifications' => $notifications,
        'unread_count' => $unreadCount,
    ]);
}

public function markRead(Request $request, int $id): JsonResponse
{
    $notification = CustomerNotification::where('user_id', $request->user()->id)
        ->where('id', $id)
        ->firstOrFail();

    if (!$notification->is_read) {
        $notification->is_read = true;
        $notification->read_at = now();
        $notification->save();
    }

    return response()->json([
        'status' => 'success',
        'notification' => $notification,
    ]);
}

public function markAllRead(Request $request): JsonResponse
{
    CustomerNotification::where('user_id', $request->user()->id)
        ->where('is_read', false)
        ->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

    return response()->json([
        'status' => 'success',
    ]);
}

public function destroy(Request $request, int $id): JsonResponse
{
    $notification = CustomerNotification::where('user_id', $request->user()->id)
        ->where('id', $id)
        ->firstOrFail();
    $notification->delete();

    return response()->json([
        'status' => 'success',
    ]);
}

public function destroyAll(Request $request): JsonResponse
{
    CustomerNotification::where('user_id', $request->user()->id)->delete();

    return response()->json([
        'status' => 'success',
    ]);
}
```

### Routes
File: `backend/routes/user/notifications.php`

```php
Route::get('/notifications', [CustomerNotificationController::class, 'index']);
Route::patch('/notifications/{id}/read', [CustomerNotificationController::class, 'markRead']);
Route::patch('/notifications/read-all', [CustomerNotificationController::class, 'markAllRead']);
Route::delete('/notifications/{id}', [CustomerNotificationController::class, 'destroy']);
Route::delete('/notifications', [CustomerNotificationController::class, 'destroyAll']);
```

### Order Status Hook
File: `backend/app/Http/Controllers/OrderController.php`

```php
if ($previousStatus !== $order->status && in_array($order->status, ['SHIPPED', 'CANCELLED'], true)) {
    $orderLabel = sprintf('#ORD-%05d', $order->id);
    $statusLabel = $order->status === 'SHIPPED' ? 'shipped' : 'cancelled';
    $title = $order->status === 'SHIPPED' ? 'Order shipped' : 'Order cancelled';
    $type = $order->status === 'SHIPPED' ? 'ORDER_SHIPPED' : 'ORDER_CANCELLED';

    CustomerNotification::create([
        'user_id' => $order->user_id,
        'order_id' => $order->id,
        'type' => $type,
        'title' => $title,
        'message' => "Your order {$orderLabel} has been {$statusLabel}.",
        'is_read' => false,
    ]);
}
```

## Frontend (Customer)

### Customer Dashboard Notifications Tab
File: `frontend/app/components/customer/CustomerView.js`

```jsx
const [notifications, setNotifications] = useState([]);
const [unreadNotifications, setUnreadNotifications] = useState(0);
const [deletingNotifications, setDeletingNotifications] = useState({});
const [clearingNotifications, setClearingNotifications] = useState(false);

const fetchNotifications = async ({ force = false } = {}) => {
  if (notificationsLoading || (!force && notificationsLoaded)) return;
  const response = await api.get('/notifications');
  setNotifications(response.data.notifications || []);
  setUnreadNotifications(response.data.unread_count || 0);
  setNotificationsLoaded(true);
};

const handleNotificationClick = async (notification) => {
  if (!notification.is_read) {
    await api.patch(`/notifications/${notification.id}/read`);
  }
  if (notification.order_id) {
    await fetchOrders({ force: true });
    setSelectedOrderId(notification.order_id);
    setExpandedOrderId(notification.order_id);
    setActiveTab("orders");
  }
};

const handleDeleteNotification = async (notificationId, wasUnread) => {
  await api.delete(`/notifications/${notificationId}`);
  setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
  if (wasUnread) setUnreadNotifications((prev) => Math.max(prev - 1, 0));
};

const handleClearNotifications = async () => {
  await api.delete('/notifications');
  setNotifications([]);
  setUnreadNotifications(0);
};
```

### Home Page Bell Icon
File: `frontend/app/components/HomeClient.js`

```jsx
const [unreadNotifications, setUnreadNotifications] = useState(0);
const [hasToken, setHasToken] = useState(false);

const fetchNotifications = async ({ force = false } = {}) => {
  if (notificationsLoading || (notificationsFetched && !force)) return;
  const response = await api.get('/notifications');
  setUnreadNotifications(response.data.unread_count || 0);
  setNotificationsFetched(true);
};

useEffect(() => {
  if (hasToken) {
    fetchNotifications();
  }
}, [hasToken]);

<button
  onClick={() => router.push("/components/customer?tab=notifications")}
  className="relative p-2 text-green-600 hover:text-green-700 transition-colors"
>
  <BellIcon />
  {unreadNotifications > 0 && (
    <span className="badge">{unreadNotifications}</span>
  )}
</button>
```


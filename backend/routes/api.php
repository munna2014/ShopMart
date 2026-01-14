<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReviewController;

require __DIR__ . '/user/auth.php';
require __DIR__ . '/user/products.php';
require __DIR__ . '/user/categories.php';

// Product reviews (public)
Route::get('/products/{product}/reviews', [ReviewController::class, 'index']);

// Customer authenticated routes
Route::group(['middleware' => ['auth:sanctum']], function () {
    require __DIR__ . '/user/account.php';
    require __DIR__ . '/user/addresses.php';
    require __DIR__ . '/user/profile.php';
    require __DIR__ . '/user/orders.php';
    require __DIR__ . '/user/notifications.php';
    require __DIR__ . '/user/cart.php';
    require __DIR__ . '/user/loyalty.php';
    require __DIR__ . '/user/coupons.php';
    Route::post('/products/{product}/reviews', [ReviewController::class, 'store']);
    Route::put('/reviews/{review}', [ReviewController::class, 'update']);
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy']);
});

// Public routes for home page
Route::get('/home/stats', function () {
    $dashboardService = app(\App\Services\DashboardService::class);
    $stats = $dashboardService->getHomeStats();

    return response()->json([
        'total_products' => $stats['total_products'],
        'total_customers' => $stats['total_customers'],
        'total_orders' => $stats['total_orders'],
    ]);
});

// Admin-only routes
Route::group(['middleware' => ['auth:sanctum', 'admin']], function () {
    require __DIR__ . '/admin/dashboard.php';
    require __DIR__ . '/admin/products.php';
    require __DIR__ . '/admin/categories.php';
    require __DIR__ . '/admin/orders.php';
    require __DIR__ . '/admin/users.php';
    require __DIR__ . '/admin/coupons.php';
});

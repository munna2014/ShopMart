<?php

use Illuminate\Support\Facades\Route;

require __DIR__ . '/user/auth.php';
require __DIR__ . '/user/products.php';
require __DIR__ . '/user/categories.php';

// Customer authenticated routes
Route::group(['middleware' => ['auth:sanctum']], function () {
    require __DIR__ . '/user/account.php';
    require __DIR__ . '/user/addresses.php';
    require __DIR__ . '/user/profile.php';
    require __DIR__ . '/user/orders.php';
    require __DIR__ . '/user/cart.php';
});

// Public routes for home page
Route::get('/home/stats', function () {
    $dashboardService = app(\App\Services\DashboardService::class);
    $stats = $dashboardService->getDashboardStats();

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
});

<?php

use Illuminate\Support\Facades\Route;

require __DIR__ . '/user/auth.php';
require __DIR__ . '/user/home.php';
require __DIR__ . '/user/categories.php';
require __DIR__ . '/user/products.php';

// Customer authenticated routes
Route::group(['middleware' => ['auth:sanctum']], function () {
    require __DIR__ . '/user/account.php';
    require __DIR__ . '/user/addresses.php';
    require __DIR__ . '/user/profile.php';
    require __DIR__ . '/user/orders.php';
    require __DIR__ . '/user/cart.php';
});

// Admin-only routes
Route::group(['middleware' => ['auth:sanctum', 'admin']], function () {
    require __DIR__ . '/admin/dashboard.php';
    require __DIR__ . '/admin/products.php';
    require __DIR__ . '/admin/categories.php';
    require __DIR__ . '/admin/orders.php';
    require __DIR__ . '/admin/users.php';
});

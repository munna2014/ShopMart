<?php

use Illuminate\Support\Facades\Route;

require __DIR__ . '/user/auth.php';
require __DIR__ . '/user/home.php';
require __DIR__ . '/user/categories.php';
require __DIR__ . '/user/products.php';

// Customer authenticated routes
Route::group(['middleware' => ['auth:sanctum']], function () {
    require __DIR__ . '/user/account.php';
    require __DIR__ . '/user/addresses/index.php';
    require __DIR__ . '/user/addresses/show.php';
    require __DIR__ . '/user/addresses/store.php';
    require __DIR__ . '/user/addresses/update.php';
    require __DIR__ . '/user/addresses/destroy.php';
    require __DIR__ . '/user/profile.php';
    require __DIR__ . '/user/orders.php';
    require __DIR__ . '/user/cart.php';
});

// Admin-only routes
Route::group(['middleware' => ['auth:sanctum', 'admin']], function () {
    require __DIR__ . '/admin/dashboard.php';
    require __DIR__ . '/admin/products/index.php';
    require __DIR__ . '/admin/products/show.php';
    require __DIR__ . '/admin/products/store.php';
    require __DIR__ . '/admin/products/update.php';
    require __DIR__ . '/admin/products/destroy.php';
    require __DIR__ . '/admin/categories/index.php';
    require __DIR__ . '/admin/categories/show.php';
    require __DIR__ . '/admin/categories/store.php';
    require __DIR__ . '/admin/categories/update.php';
    require __DIR__ . '/admin/categories/destroy.php';
    require __DIR__ . '/admin/orders.php';
    require __DIR__ . '/admin/users.php';
});

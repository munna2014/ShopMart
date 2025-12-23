<?php

use Illuminate\Support\Facades\Route;

require __DIR__ . '/user/auth/register.php';
require __DIR__ . '/user/auth/login.php';
require __DIR__ . '/user/auth/verify_otp.php';
require __DIR__ . '/user/auth/resend_otp.php';
require __DIR__ . '/user/auth/forgot_password.php';
require __DIR__ . '/user/auth/verify_reset_otp.php';
require __DIR__ . '/user/auth/reset_password.php';
require __DIR__ . '/user/home.php';
require __DIR__ . '/user/categories.php';
require __DIR__ . '/user/products.php';

// Customer authenticated routes
Route::group(['middleware' => ['auth:sanctum']], function () {
    require __DIR__ . '/user/account/logout.php';
    require __DIR__ . '/user/account/user.php';
    require __DIR__ . '/user/account/check_admin.php';
    require __DIR__ . '/user/addresses/index.php';
    require __DIR__ . '/user/addresses/show.php';
    require __DIR__ . '/user/addresses/store.php';
    require __DIR__ . '/user/addresses/update.php';
    require __DIR__ . '/user/addresses/destroy.php';
    require __DIR__ . '/user/profile.php';
    require __DIR__ . '/user/orders/index.php';
    require __DIR__ . '/user/orders/store.php';
    require __DIR__ . '/user/cart/show.php';
    require __DIR__ . '/user/cart/add_item.php';
    require __DIR__ . '/user/cart/update_item.php';
    require __DIR__ . '/user/cart/remove_item.php';
    require __DIR__ . '/user/cart/clear.php';
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
    require __DIR__ . '/admin/orders/index.php';
    require __DIR__ . '/admin/orders/update_status.php';
    require __DIR__ . '/admin/users/index.php';
    require __DIR__ . '/admin/users/destroy.php';
});

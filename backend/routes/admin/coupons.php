<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CouponController;

Route::get('/admin/coupons', [CouponController::class, 'adminIndex']);
Route::post('/admin/coupons', [CouponController::class, 'adminStore']);
Route::patch('/admin/coupons/{coupon}', [CouponController::class, 'adminUpdate']);

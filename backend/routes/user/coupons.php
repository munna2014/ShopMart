<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CouponController;

Route::get('/coupons/active', [CouponController::class, 'activeCoupons']);
Route::post('/coupons/validate', [CouponController::class, 'validateCoupon']);

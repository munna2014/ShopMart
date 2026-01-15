<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

// Standard OTP rate limits: 5 requests per 10 minutes
Route::post('/register', [AuthController::class, 'register'])->middleware('otp.limit:5,10');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');
Route::post('/resend-otp', [AuthController::class, 'resendOtp'])->middleware('otp.limit:5,10');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('otp.limit:5,10');
Route::post('/verify-reset-otp', [AuthController::class, 'verifyResetOtp'])->middleware('throttle:10,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');



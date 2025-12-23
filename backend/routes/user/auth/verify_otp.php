<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);

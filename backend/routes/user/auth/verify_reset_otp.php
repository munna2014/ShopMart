<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/verify-reset-otp', [AuthController::class, 'verifyResetOtp']);

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/resend-otp', [AuthController::class, 'resendOtp']);

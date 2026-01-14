<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LoyaltyController;

// Loyalty points routes
Route::get('/loyalty/balance', [LoyaltyController::class, 'getBalance']);
Route::get('/loyalty/history', [LoyaltyController::class, 'getHistory']);
Route::post('/loyalty/calculate-redemption', [LoyaltyController::class, 'calculateRedemption']);

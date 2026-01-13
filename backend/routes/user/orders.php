<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrderController;

Route::get('/payments/stripe/config', [OrderController::class, 'stripeConfig']);
Route::post('/orders/{id}/stripe-confirm', [OrderController::class, 'confirmStripePayment']);
Route::post('/orders/{id}/stripe-pay', [OrderController::class, 'createStripePayment']);
Route::get('/orders', [OrderController::class, 'index']);
Route::get('/orders/summary', [OrderController::class, 'summary']);
Route::get('/orders/{id}', [OrderController::class, 'show']);
Route::post('/orders', [OrderController::class, 'store']);
Route::patch('/orders/{id}/cancel', [OrderController::class, 'cancel']);

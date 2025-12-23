<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CartController;

Route::get('/cart', [CartController::class, 'show']);
Route::post('/cart/items', [CartController::class, 'addItem']);
Route::patch('/cart/items/{productId}', [CartController::class, 'updateItem']);
Route::delete('/cart/items/{productId}', [CartController::class, 'removeItem']);
Route::delete('/cart', [CartController::class, 'clear']);

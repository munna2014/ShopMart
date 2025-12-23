<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CartController;

Route::post('/cart/items', [CartController::class, 'addItem']);

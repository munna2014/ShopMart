<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CartController;

Route::patch('/cart/items/{productId}', [CartController::class, 'updateItem']);

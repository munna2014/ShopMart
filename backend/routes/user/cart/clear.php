<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CartController;

Route::delete('/cart', [CartController::class, 'clear']);

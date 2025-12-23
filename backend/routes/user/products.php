<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;

Route::get('/home/featured-products', [ProductController::class, 'featured']);
Route::get('/customer/products', [ProductController::class, 'index']);

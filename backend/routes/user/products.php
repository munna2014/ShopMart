<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;

Route::get('/home/featured-products', [ProductController::class, 'featured']);
Route::get('/customer/products', [ProductController::class, 'customerProducts']);
Route::get('/products/suggestions', [ProductController::class, 'suggestions']);
Route::get('/products/{id}', [ProductController::class, 'show']);

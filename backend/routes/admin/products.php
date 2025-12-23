<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;

Route::apiResource('products', ProductController::class);
Route::get('/admin/products', [ProductController::class, 'adminIndex']);

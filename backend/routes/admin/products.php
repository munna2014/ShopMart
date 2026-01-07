<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;

Route::get('/admin/products', [ProductController::class, 'adminIndex']);
Route::post('/admin/products', [ProductController::class, 'store']);
Route::post('/admin/products/bulk', [ProductController::class, 'bulkStore']);
Route::get('/admin/products/{product}', [ProductController::class, 'show']);
Route::put('/admin/products/{product}', [ProductController::class, 'update']);
Route::patch('/admin/products/{product}', [ProductController::class, 'update']);
Route::delete('/admin/products/{product}', [ProductController::class, 'destroy']);

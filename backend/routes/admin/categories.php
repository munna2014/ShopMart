<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;

Route::get('/admin/categories', [CategoryController::class, 'index']);
Route::post('/admin/categories', [CategoryController::class, 'store']);
Route::get('/admin/categories/{category}', [CategoryController::class, 'show']);
Route::put('/admin/categories/{category}', [CategoryController::class, 'update']);
Route::patch('/admin/categories/{category}', [CategoryController::class, 'update']);
Route::delete('/admin/categories/{category}', [CategoryController::class, 'destroy']);

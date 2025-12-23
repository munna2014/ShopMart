<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;

Route::put('/admin/categories/{category}', [CategoryController::class, 'update']);
Route::patch('/admin/categories/{category}', [CategoryController::class, 'update']);

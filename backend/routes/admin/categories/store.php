<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;

Route::post('/admin/categories', [CategoryController::class, 'store']);

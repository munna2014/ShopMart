<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;

Route::get('/admin/categories/{category}', [CategoryController::class, 'show']);

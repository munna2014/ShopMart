<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;

Route::delete('/admin/categories/{category}', [CategoryController::class, 'destroy']);

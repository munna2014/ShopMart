<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;

Route::apiResource('/admin/categories', CategoryController::class);

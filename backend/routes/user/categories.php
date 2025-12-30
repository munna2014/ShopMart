<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;

Route::get('/categories', [CategoryController::class, 'publicIndex']);
Route::get('/home/categories', [CategoryController::class, 'homeCategories']);

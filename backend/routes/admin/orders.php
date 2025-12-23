<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrderController;

Route::get('/admin/orders', [OrderController::class, 'adminIndex']);
Route::patch('/admin/orders/{id}/status', [OrderController::class, 'updateStatus']);

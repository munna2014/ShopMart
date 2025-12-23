<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrderController;

Route::patch('/admin/orders/{id}/status', [OrderController::class, 'updateStatus']);

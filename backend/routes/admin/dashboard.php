<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;

Route::get('/admin/dashboard', [DashboardController::class, 'adminIndex']);

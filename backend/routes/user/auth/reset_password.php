<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/reset-password', [AuthController::class, 'resetPassword']);

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);

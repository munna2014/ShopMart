<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProfileController;

Route::put('/profile', [ProfileController::class, 'update']);
Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
Route::delete('/profile/avatar', [ProfileController::class, 'deleteAvatar']);

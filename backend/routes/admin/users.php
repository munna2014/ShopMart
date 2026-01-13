<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PendingUserController;
use App\Http\Controllers\UserController;

Route::get('/admin/users', [UserController::class, 'adminIndex']);
Route::delete('/admin/users/{id}', [UserController::class, 'destroy']);
Route::get('/admin/pending-users', [PendingUserController::class, 'index']);
Route::post('/admin/pending-users/{id}/resend', [PendingUserController::class, 'resend']);
Route::delete('/admin/pending-users/{id}', [PendingUserController::class, 'destroy']);

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;

Route::get('/admin/users', [UserController::class, 'adminIndex']);
Route::delete('/admin/users/{id}', [UserController::class, 'destroy']);

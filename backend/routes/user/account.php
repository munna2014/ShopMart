<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/user', function (Request $request) {
    return $request->user()->load('roles');
});

Route::get('/check-admin', function (Request $request) {
    $user = $request->user();
    return response()->json([
        'is_admin' => $user->hasRole('admin'),
        'roles' => $user->roles->pluck('name')
    ]);
});

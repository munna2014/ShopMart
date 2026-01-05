<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/user', function (Request $request) {
    $user = $request->user();
    if (!$user) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    return $user->load('roles');
});

Route::get('/check-admin', function (Request $request) {
    $user = $request->user();
    if (!$user) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    return response()->json([
        'is_admin' => $user->hasRole('admin'),
        'roles' => $user->roles->pluck('name')
    ]);
});

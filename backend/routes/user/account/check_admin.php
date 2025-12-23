<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/check-admin', function (Request $request) {
    $user = $request->user();
    return response()->json([
        'is_admin' => $user->hasRole('admin'),
        'roles' => $user->roles->pluck('name')
    ]);
});

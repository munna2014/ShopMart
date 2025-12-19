<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/resend-otp', [AuthController::class, 'resendOtp']);

// Password reset routes
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/verify-reset-otp', [AuthController::class, 'verifyResetOtp']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Protected routes
Route::group(['middleware' => ['auth:sanctum']], function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    // Check if user has admin role
    Route::get('/check-admin', function (Request $request) {
        $user = $request->user();
        return response()->json([
            'is_admin' => $user->hasRole('admin'),
            'roles' => $user->roles->pluck('name')
        ]);
    });
});

// Admin-only routes
Route::group(['middleware' => ['auth:sanctum', 'admin']], function () {
    Route::get('/admin/dashboard', function (Request $request) {
        return response()->json([
            'message' => 'Welcome to admin dashboard',
            'user' => $request->user(),
            'stats' => [
                'total_users' => \App\Models\User::count(),
                'total_orders' => 0, // Add when orders table is ready
                'total_products' => 0, // Add when products table is ready
            ]
        ]);
    });
    
    Route::get('/admin/users', function (Request $request) {
        $users = \App\Models\User::with('roles')->get();
        return response()->json(['users' => $users]);
    });
});

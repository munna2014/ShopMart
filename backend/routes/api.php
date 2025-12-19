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
    // Dashboard stats
    Route::get('/admin/dashboard', function (Request $request) {
        $totalUsers = \App\Models\User::count();
        $totalCustomers = \App\Models\User::whereHas('roles', function($query) {
            $query->where('name', 'customer');
        })->count();
        
        return response()->json([
            'message' => 'Welcome to admin dashboard',
            'user' => $request->user(),
            'stats' => [
                'total_users' => $totalUsers,
                'total_customers' => $totalCustomers,
                'total_orders' => 0, // Add when orders table is ready
                'total_products' => 0, // Add when products table is ready
                'revenue' => '$0.00', // Add when orders table is ready
            ]
        ]);
    });
    
    // Get all users/customers
    Route::get('/admin/users', function (Request $request) {
        $users = \App\Models\User::with('roles')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->full_name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('name'),
                    'is_active' => $user->is_active,
                    'created_at' => $user->created_at,
                    'joined' => $user->created_at->format('M d, Y'),
                    'orders' => 0, // Add when orders table is ready
                    'spent' => '$0.00', // Add when orders table is ready
                ];
            });
        
        return response()->json(['users' => $users]);
    });
    
    // Delete user (admin only)
    Route::delete('/admin/users/{id}', function (Request $request, $id) {
        $user = \App\Models\User::findOrFail($id);
        
        // Prevent deleting yourself
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account'], 403);
        }
        
        // Prevent deleting other admins
        if ($user->hasRole('admin')) {
            return response()->json(['message' => 'You cannot delete admin users'], 403);
        }
        
        $user->delete();
        
        return response()->json(['message' => 'User deleted successfully']);
    });
});

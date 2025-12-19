<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;

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
        return $request->user()->load('roles');
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
        $dashboardService = app(\App\Services\DashboardService::class);
        $stats = $dashboardService->getDashboardStats();
        $recentActivity = $dashboardService->getRecentActivity(5);
        
        return response()->json([
            'message' => 'Welcome to admin dashboard',
            'user' => $request->user(),
            'stats' => [
                'total_users' => $stats['total_users'],
                'total_customers' => $stats['total_customers'],
                'total_orders' => $stats['total_orders'],
                'total_products' => $stats['total_products'],
                'revenue' => $stats['revenue_formatted'],
                // Additional stats for enhanced dashboard
                'active_products' => $stats['active_products'],
                'in_stock_products' => $stats['in_stock_products'],
                'out_of_stock_products' => $stats['out_of_stock_products'],
                'pending_orders' => $stats['pending_orders'],
                'completed_orders' => $stats['completed_orders'],
                'monthly_revenue' => $stats['monthly_revenue_formatted'],
                'user_growth_rate' => $stats['user_growth_rate'],
                'recent_users' => $stats['recent_users'],
                'recent_products' => $stats['recent_products'],
            ],
            'recent_activity' => $recentActivity,
            'detailed_stats' => $stats // Full stats for advanced features
        ]);
    });
    
    // Product management routes
    Route::apiResource('products', ProductController::class);
    Route::get('/admin/products', [ProductController::class, 'adminIndex']);
    
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

// Public routes for home page
Route::get('/home/stats', function () {
    $dashboardService = app(\App\Services\DashboardService::class);
    $stats = $dashboardService->getDashboardStats();
    
    return response()->json([
        'total_products' => $stats['total_products'],
        'total_customers' => $stats['total_customers'],
        'total_orders' => $stats['total_orders'],
    ]);
});

Route::get('/home/categories', function () {
    $categories = \App\Models\Category::where('is_active', true)
        ->orderBy('sort_order')
        ->get()
        ->map(function($category) {
            return [
                'name' => $category->name,
                'count' => 0, // TODO: Add product count when products table is ready
                'icon' => $category->icon,
                'color' => $category->color,
            ];
        });
    
    return response()->json(['categories' => $categories]);
});

// Categories API for admin
Route::get('/categories', function () {
    $categories = \App\Models\Category::where('is_active', true)
        ->orderBy('sort_order')
        ->get();
    
    return response()->json(['categories' => $categories]);
});

// Public product routes
Route::get('/home/featured-products', [ProductController::class, 'featured']);
Route::get('/customer/products', [ProductController::class, 'index']);

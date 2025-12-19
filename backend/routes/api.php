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

// Public routes for home page
Route::get('/home/stats', function () {
    $totalUsers = \App\Models\User::count();
    $totalCustomers = \App\Models\User::whereHas('roles', function($query) {
        $query->where('name', 'customer');
    })->count();
    
    return response()->json([
        'total_products' => 0, // Add when products table is ready
        'total_customers' => $totalCustomers,
        'total_orders' => 0, // Add when orders table is ready
    ]);
});

Route::get('/home/categories', function () {
    // For now, return static categories until we have a categories table
    return response()->json([
        'categories' => [
            [
                'name' => 'Electronics',
                'count' => 0,
                'icon' => 'M2 7h20M2 7v13a2 2 0 002 2h16a2 2 0 002-2V7M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
                'color' => 'from-purple-500 to-purple-600',
            ],
            [
                'name' => 'Fashion',
                'count' => 0,
                'icon' => 'M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
                'color' => 'from-blue-500 to-blue-600',
            ],
            [
                'name' => 'Home & Living',
                'count' => 0,
                'icon' => 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10',
                'color' => 'from-green-500 to-green-600',
            ],
            [
                'name' => 'Sports & Outdoors',
                'count' => 0,
                'icon' => 'M9 21a1 1 0 100-2 1 1 0 000 2zM20 21a1 1 0 100-2 1 1 0 000 2zM1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6',
                'color' => 'from-orange-500 to-orange-600',
            ],
            [
                'name' => 'Beauty & Health',
                'count' => 0,
                'icon' => 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
                'color' => 'from-pink-500 to-pink-600',
            ],
            [
                'name' => 'Books & Media',
                'count' => 0,
                'icon' => 'M2 7h20M2 7v15h20V7M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16M6 11h12M6 15h12',
                'color' => 'from-teal-500 to-teal-600',
            ],
        ]
    ]);
});

Route::get('/home/featured-products', function () {
    // For now, return empty array until we have products table
    return response()->json([
        'products' => []
    ]);
});

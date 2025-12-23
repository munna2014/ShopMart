<?php

use Illuminate\Support\Facades\Route;

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
            // Count active products in this category
            $productCount = \App\Models\Product::where('category_id', $category->id)
                ->where('is_active', true)
                ->count();

            return [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'count' => $productCount,
                'icon' => $category->icon,
                'color' => $category->color,
            ];
        });

    return response()->json(['categories' => $categories]);
});

<?php

use Illuminate\Support\Facades\Route;

// Categories API for admin (public)
Route::get('/categories', function () {
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
                'product_count' => $productCount,
                'icon' => $category->icon,
                'color' => $category->color,
                'is_active' => $category->is_active,
                'sort_order' => $category->sort_order,
            ];
        });

    return response()->json(['categories' => $categories]);
});

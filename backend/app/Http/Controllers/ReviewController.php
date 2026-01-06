<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request, int $productId)
    {
        $product = Product::findOrFail($productId);
        $user = $request->user() ?: auth('sanctum')->user();

        $reviews = Review::with('user')
            ->where('product_id', $product->id)
            ->orderByDesc('created_at')
            ->get();

        $average = $reviews->count() > 0 ? round($reviews->avg('rating'), 1) : 0;

        $items = $reviews->map(function (Review $review) use ($user) {
            $isOwner = $user && $review->user_id === $user->id;
            $isAdmin = $user && $user->hasRole('admin');

            return [
                'id' => $review->id,
                'rating' => $review->rating,
                'title' => $review->title,
                'body' => $review->body,
                'created_at' => optional($review->created_at)->toISOString(),
                'user' => [
                    'id' => $review->user->id ?? null,
                    'full_name' => $review->user->full_name ?? 'Customer',
                    'avatar_url' => $review->user->avatar_url ?? null,
                ],
                'can_edit' => $isOwner,
                'can_delete' => $isOwner || $isAdmin,
            ];
        });

        return response()->json([
            'product_id' => $product->id,
            'average_rating' => $average,
            'review_count' => $reviews->count(),
            'reviews' => $items,
        ]);
    }

    public function store(Request $request, int $productId)
    {
        $user = $request->user();
        $product = Product::findOrFail($productId);

        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'nullable|string|max:120',
            'body' => 'required|string|max:2000',
        ]);

        $existing = Review::where('product_id', $product->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You have already reviewed this product.',
            ], 422);
        }

        $review = Review::create([
            'product_id' => $product->id,
            'user_id' => $user->id,
            'rating' => $request->rating,
            'title' => $request->title,
            'body' => $request->body,
        ]);

        $review->load('user');

        return response()->json([
            'message' => 'Review submitted successfully.',
            'review' => [
                'id' => $review->id,
                'rating' => $review->rating,
                'title' => $review->title,
                'body' => $review->body,
                'created_at' => optional($review->created_at)->toISOString(),
                'user' => [
                    'id' => $review->user->id ?? null,
                    'full_name' => $review->user->full_name ?? 'Customer',
                    'avatar_url' => $review->user->avatar_url ?? null,
                ],
                'can_edit' => true,
                'can_delete' => true,
            ],
        ]);
    }

    public function update(Request $request, int $reviewId)
    {
        $user = $request->user();
        $review = Review::findOrFail($reviewId);

        $isOwner = $review->user_id === $user->id;
        $isAdmin = $user->hasRole('admin');

        if (!$isOwner && !$isAdmin) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'rating' => 'sometimes|integer|min:1|max:5',
            'title' => 'nullable|string|max:120',
            'body' => 'sometimes|string|max:2000',
        ]);

        $review->fill($data);
        $review->save();

        $review->load('user');

        return response()->json([
            'message' => 'Review updated successfully.',
            'review' => [
                'id' => $review->id,
                'rating' => $review->rating,
                'title' => $review->title,
                'body' => $review->body,
                'created_at' => optional($review->created_at)->toISOString(),
                'user' => [
                    'id' => $review->user->id ?? null,
                    'full_name' => $review->user->full_name ?? 'Customer',
                    'avatar_url' => $review->user->avatar_url ?? null,
                ],
                'can_edit' => $isOwner,
                'can_delete' => $isOwner || $isAdmin,
            ],
        ]);
    }

    public function destroy(Request $request, int $reviewId)
    {
        $user = $request->user();
        $review = Review::findOrFail($reviewId);

        $isOwner = $review->user_id === $user->id;
        $isAdmin = $user->hasRole('admin');

        if (!$isOwner && !$isAdmin) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $review->delete();

        return response()->json([
            'message' => 'Review deleted successfully.',
        ]);
    }
}

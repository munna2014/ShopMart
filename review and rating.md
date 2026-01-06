# Review and Rating

This file tracks review and rating related code paths across API, backend, and frontend. Snippets below are review-related excerpts; check the referenced files for full context.

## API (routes)
Path: `backend/routes/api.php`
```php
use App\Http\Controllers\ReviewController;

// Product reviews (public)
Route::get('/products/{product}/reviews', [ReviewController::class, 'index']);

// Customer authenticated routes
Route::group(['middleware' => ['auth:sanctum']], function () {
    Route::post('/products/{product}/reviews', [ReviewController::class, 'store']);
    Route::put('/reviews/{review}', [ReviewController::class, 'update']);
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy']);
});
```

## Backend
### Review controller
Path: `backend/app/Http/Controllers/ReviewController.php`
```php
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
```

### Review model
Path: `backend/app/Models/Review.php`
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'user_id',
        'rating',
        'title',
        'body',
    ];

    protected $casts = [
        'rating' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

### Product and user relationships
Paths: `backend/app/Models/Product.php`, `backend/app/Models/User.php`
```php
public function reviews()
{
    return $this->hasMany(Review::class);
}
```

### Reviews table migration
Path: `backend/database/migrations/2026_01_05_000003_create_reviews_table.php`
```php
Schema::create('reviews', function (Blueprint $table) {
    $table->id();
    $table->foreignId('product_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->unsignedTinyInteger('rating');
    $table->string('title')->nullable();
    $table->text('body');
    $table->timestamps();

    $table->unique(['product_id', 'user_id']);
});
```

### Product list rating placeholders
Path: `backend/app/Http/Controllers/ProductController.php`
```php
'rating' => 4, // Default rating - you can add a rating system later
'reviews' => rand(10, 100), // Mock reviews - you can add a review system later
```

## Frontend
### Public product details (reviews)
Path: `frontend/app/productDetails/[id]/page.js`
```jsx
const [reviews, setReviews] = useState([]);
const [reviewsLoading, setReviewsLoading] = useState(true);
const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0 });
const [reviewForm, setReviewForm] = useState({
  rating: 5,
  title: "",
  body: "",
});

useEffect(() => {
  if (!id) return;
  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await api.get(`/products/${id}/reviews`);
      setReviews(response.data.reviews || []);
      setReviewSummary({
        average: response.data.average_rating || 0,
        count: response.data.review_count || 0,
      });
    } finally {
      setReviewsLoading(false);
    }
  };
  fetchReviews();
}, [id, isAuthenticated]);

const handleReviewSubmit = async (event) => {
  event.preventDefault();
  if (!reviewForm.body.trim()) {
    setReviewError("Please write a review before submitting.");
    return;
  }

  if (reviewEditingId) {
    await api.put(`/reviews/${reviewEditingId}`, {
      rating: Number(reviewForm.rating),
      title: reviewForm.title.trim() || null,
      body: reviewForm.body.trim(),
    });
  } else {
    await api.post(`/products/${id}/reviews`, {
      rating: Number(reviewForm.rating),
      title: reviewForm.title.trim() || null,
      body: reviewForm.body.trim(),
    });
  }
};
```

### Customer product details (reviews + auth redirect)
Path: `frontend/app/components/customer/productDetails/[id]/page.js`
```jsx
useEffect(() => {
  if (loading) return;
  if (!isAuthenticated) {
    router.replace(`/login?redirect=/components/customer/productDetails/${productId}`);
  } else if (isAdmin()) {
    router.replace("/components/admin");
  }
}, [loading, isAuthenticated, isAdmin, router, productId]);

const handleDeleteReview = async (reviewId) => {
  if (!confirm("Delete this review?")) return;
  await api.delete(`/reviews/${reviewId}`);
};
```

### Rating display in list cards
Paths: `frontend/app/components/HomeClient.js`, `frontend/app/components/customer/CustomerView.js`, `frontend/app/products/page.js`
```jsx
<div className="flex text-yellow-400">
  {"ミ.".repeat(product.rating || 4)}
  {"ミ+".repeat(5 - (product.rating || 4))}
</div>
```

### Star rendering in details pages
Paths: `frontend/app/productDetails/[id]/page.js`, `frontend/app/components/customer/productDetails/[id]/page.js`
```jsx
const renderStars = (value) =>
  Array.from({ length: 5 }).map((_, index) => (
    <span
      key={`star-${value}-${index}`}
      className={index < value ? "text-yellow-500" : "text-gray-300"}
    >
      *
    </span>
  ));
```

## Review payload shape
Path: `backend/app/Http/Controllers/ReviewController.php`
```json
{
  "product_id": 123,
  "average_rating": 4.2,
  "review_count": 7,
  "reviews": [
    {
      "id": 98,
      "rating": 5,
      "title": "Great quality",
      "body": "Solid build and fast delivery.",
      "created_at": "2026-01-06T10:15:30.000000Z",
      "user": {
        "id": 12,
        "full_name": "Customer",
        "avatar_url": null
      },
      "can_edit": true,
      "can_delete": true
    }
  ]
}
```

# Search Suggestion Workflow

This document explains how product search suggestions work across the site, including the API, backend logic, and frontend usage.

## API

**Endpoint**
- `GET /api/products/suggestions`

**Query Parameters**
- `q` (string, required): user input used for prefix matching
- `limit` (int, optional, default 6): max number of suggestions

**Response (JSON)**
```json
{
  "status": "success",
  "suggestions": [
    { "id": 1, "name": "Bag" },
    { "id": 2, "name": "Bag for women" }
  ]
}
```

## Backend

**Route**
- `backend/routes/user/products.php`
```php
Route::get('/products/suggestions', [ProductController::class, 'suggestions']);
```

**Controller**
- `backend/app/Http/Controllers/ProductController.php`
- Prefix match uses `name LIKE 'q%'` and only returns active products.
```php
public function suggestions(Request $request): JsonResponse
{
    $query = trim((string) $request->get('q', ''));
    $limit = (int) $request->get('limit', 6);
    if ($limit <= 0) {
        $limit = 6;
    }
    if ($query === '') {
        return response()->json([
            'status' => 'success',
            'suggestions' => [],
        ]);
    }

    $safeQuery = addcslashes($query, '%_\\');
    $suggestions = Product::select('id', 'name')
        ->active()
        ->where('name', 'like', $safeQuery . '%')
        ->orderBy('name')
        ->limit($limit)
        ->get();

    return response()->json([
        'status' => 'success',
        'suggestions' => $suggestions,
    ]);
}
```

## Frontend

All three search boxes use a 200ms debounce, show suggestions after 1 character, and render a dropdown list. Clicking a suggestion fills the search input.

### Home Page
- File: `frontend/app/components/HomeClient.js`
- Calls `/products/suggestions` and navigates to `/products?search=...` on selection.
```js
const response = await api.get('/products/suggestions', {
  params: { q: trimmed, limit: 6 },
});
setSearchSuggestions(response.data.suggestions || []);
```

### Products Page
- File: `frontend/app/products/page.js`
- Calls `/products/suggestions` and updates the local search field.
```js
const response = await api.get('/products/suggestions', {
  params: { q: trimmed, limit: 6 },
});
setSearchSuggestions(response.data.suggestions || []);
```

### Customer Shop (Profile -> Shop)
- File: `frontend/app/components/customer/CustomerView.js`
- Calls `/products/suggestions` when the Shop tab is active.
```js
const response = await api.get('/products/suggestions', {
  params: { q: trimmed, limit: 6 },
});
setProductSuggestions(response.data.suggestions || []);
```

## User Flow Summary

1. User types a letter (example: `B`).
2. Frontend waits 200ms, calls `/api/products/suggestions?q=B&limit=6`.
3. Backend returns active product names starting with `B`.
4. Dropdown lists those names; user can click to fill the input.


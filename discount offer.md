# Discount Offer

This file documents the discount offer feature (percent-only, single discount per product, optional schedule). Discounts are applied at checkout and stored on order items (orders only), while product/cart UI shows discounted pricing.

## Database
Path: `backend/database/migrations/2026_01_05_000004_add_product_discounts_to_products_table.php`
```php
Schema::table('products', function (Blueprint $table) {
    $table->decimal('discount_percent', 5, 2)->nullable()->after('highlight_4');
    $table->timestamp('discount_starts_at')->nullable()->after('discount_percent');
    $table->timestamp('discount_ends_at')->nullable()->after('discount_starts_at');
});
```

Path: `backend/database/migrations/2026_01_05_000005_add_discount_fields_to_order_items_table.php`
```php
Schema::table('order_items', function (Blueprint $table) {
    $table->decimal('original_unit_price', 18, 2)->nullable()->after('unit_price');
    $table->decimal('discount_percent', 5, 2)->default(0)->after('original_unit_price');
});
```

## Backend
### Product model discount helpers
Path: `backend/app/Models/Product.php`
```php
protected $fillable = [
    // ...
    'discount_percent',
    'discount_starts_at',
    'discount_ends_at',
];

protected $casts = [
    // ...
    'discount_percent' => 'decimal:2',
    'discount_starts_at' => 'datetime',
    'discount_ends_at' => 'datetime',
];

public function getActiveDiscountPercent(): float
{
    $percent = (float) ($this->discount_percent ?? 0);
    if ($percent <= 0) {
        return 0.0;
    }

    $now = now();
    if ($this->discount_starts_at && $now->lt($this->discount_starts_at)) {
        return 0.0;
    }
    if ($this->discount_ends_at && $now->gt($this->discount_ends_at)) {
        return 0.0;
    }

    return $percent;
}

public function getDiscountedPrice(): float
{
    $price = (float) $this->price;
    $percent = $this->getActiveDiscountPercent();
    if ($percent <= 0) {
        return $price;
    }

    return round($price * (1 - ($percent / 100)), 2);
}
```

### Product create/update validation
Path: `backend/app/Http/Controllers/ProductController.php`
```php
'discount_percent' => 'nullable|numeric|min:0|max:100',
'discount_starts_at' => 'nullable|date',
'discount_ends_at' => 'nullable|date|after_or_equal:discount_starts_at',
```

### Product detail response adds discount data
Path: `backend/app/Http/Controllers/ProductController.php`
```php
$product = Product::with('category')->findOrFail($id);
$discountPercent = $product->getActiveDiscountPercent();
$product->setAttribute('discount_active', $discountPercent > 0);
$product->setAttribute('discounted_price', $product->getDiscountedPrice());
```

### Product list payload includes discount fields
Path: `backend/app/Http/Controllers/ProductController.php`
```php
$basePrice = (float) $product->price;
$discountPercent = $product->getActiveDiscountPercent();
$discountedPrice = $product->getDiscountedPrice();
$hasDiscount = $discountPercent > 0 && $discountedPrice < $basePrice;

'price' => '$' . number_format($hasDiscount ? $discountedPrice : $basePrice, 2),
'price_value' => $basePrice,
'discount_percent' => $discountPercent,
'discount_active' => $hasDiscount,
'discounted_price' => $discountedPrice,
'discounted_price_label' => '$' . number_format($discountedPrice, 2),
'discount_starts_at' => optional($product->discount_starts_at)->toISOString(),
'discount_ends_at' => optional($product->discount_ends_at)->toISOString(),
'oldPrice' => $hasDiscount ? '$' . number_format($basePrice, 2) : null,
```

### Cart payload selects discount fields for pricing
Path: `backend/app/Http/Controllers/CartController.php`
```php
$productQuery->select(
    'id',
    'name',
    'price',
    'image_url',
    'discount_percent',
    'discount_starts_at',
    'discount_ends_at'
);
```

### Checkout applies discount and stores on order items
Path: `backend/app/Http/Controllers/OrderController.php`
```php
$originalUnitPrice = (float) $product->price;
$discountPercent = $product->getActiveDiscountPercent();
$unitPrice = $discountPercent > 0
    ? round($originalUnitPrice * (1 - ($discountPercent / 100)), 2)
    : $originalUnitPrice;
$lineTotal = $unitPrice * $cartItem->quantity;

$order->items()->create([
    'product_id' => $product->id,
    'quantity' => $cartItem->quantity,
    'unit_price' => $unitPrice,
    'total_price' => $lineTotal,
    'original_unit_price' => $originalUnitPrice,
    'discount_percent' => $discountPercent,
]);
```

### Order item fields
Path: `backend/app/Models/OrderItem.php`
```php
protected $fillable = [
    'order_id',
    'product_id',
    'quantity',
    'unit_price',
    'total_price',
    'original_unit_price',
    'discount_percent',
];

protected $casts = [
    'quantity' => 'integer',
    'unit_price' => 'decimal:2',
    'total_price' => 'decimal:2',
    'original_unit_price' => 'decimal:2',
    'discount_percent' => 'decimal:2',
];
```

## Admin UI (renamed to `admin/`)
### Add product form fields
Path: `admin/src/components/AdminDashboard.jsx`
```jsx
const [productForm, setProductForm] = useState({
  // ...
  discount_percent: '',
  discount_starts_at: '',
  discount_ends_at: '',
});

if (productForm.discount_percent !== '') {
  const percentValue = Number(productForm.discount_percent);
  if (Number.isNaN(percentValue) || percentValue < 0 || percentValue > 100) {
    errors.discount_percent = 'Discount must be between 0 and 100';
  }
}

if (productForm.discount_starts_at && productForm.discount_ends_at) {
  if (productForm.discount_ends_at < productForm.discount_starts_at) {
    errors.discount_ends_at = 'End date must be on or after start date';
  }
}

if (productForm.discount_percent !== '') {
  formData.append('discount_percent', productForm.discount_percent);
}
if (productForm.discount_starts_at) {
  formData.append('discount_starts_at', productForm.discount_starts_at);
}
if (productForm.discount_ends_at) {
  formData.append('discount_ends_at', productForm.discount_ends_at);
}
```

### Add product inputs
Path: `admin/src/components/AdminDashboard.jsx`
```jsx
<input type="number" min="0" max="100" step="0.01" value={productForm.discount_percent} />
<input type="date" value={productForm.discount_starts_at} />
<input type="date" value={productForm.discount_ends_at} />
```

### Edit product fields
Path: `admin/src/components/AdminProductDetails.jsx`
```jsx
const formatDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

setEditForm({
  // ...
  discount_percent: product.discount_percent ?? "",
  discount_starts_at: formatDateInput(product.discount_starts_at),
  discount_ends_at: formatDateInput(product.discount_ends_at),
});

if (editForm.discount_percent !== "") {
  formData.append("discount_percent", editForm.discount_percent);
}
if (editForm.discount_starts_at) {
  formData.append("discount_starts_at", editForm.discount_starts_at);
}
if (editForm.discount_ends_at) {
  formData.append("discount_ends_at", editForm.discount_ends_at);
}
```

## Frontend
### Pricing helper
Path: `frontend/lib/pricing.js`
```js
export const getPricing = (product) => {
  const basePrice = parsePriceValue(
    product?.price_value ?? product?.price ?? product?.unit_price
  );
  const discountPercent = Number(product?.discount_percent ?? 0);
  const active = isDiscountActive(product) && discountPercent > 0;
  const discountedPrice = product?.discounted_price !== undefined && product?.discounted_price !== null
    ? parsePriceValue(product.discounted_price)
    : roundToCents(basePrice * (1 - discountPercent / 100));

  const effectivePrice =
    active && discountedPrice < basePrice ? discountedPrice : basePrice;

  return {
    basePrice,
    discountedPrice: effectivePrice,
    discountPercent: active ? discountPercent : 0,
    discountActive: active,
  };
};
```

### Product details price display
Path: `frontend/app/productDetails/[id]/page.js`
```jsx
const pricing = useMemo(() => getPricing(product), [product]);

<span className="text-2xl sm:text-3xl font-bold text-gray-900">
  ${pricing.discountedPrice.toFixed(2)}
</span>
{pricing.discountActive && pricing.basePrice > pricing.discountedPrice ? (
  <span className="text-sm text-gray-500 line-through">
    ${pricing.basePrice.toFixed(2)}
  </span>
) : null}
```

Path: `frontend/app/components/customer/productDetails/[id]/page.js`
```jsx
const pricing = useMemo(() => getPricing(product), [product]);
```

### Product list cards use discounted pricing
Path: `frontend/app/components/HomeClient.js`
```jsx
const pricing = getPricing(product);
const showDiscount = pricing.discountActive && pricing.basePrice > pricing.discountedPrice;

<span className="text-2xl font-bold text-gray-900">
  ${pricing.discountedPrice.toFixed(2)}
</span>
{showDiscount ? (
  <span className="text-lg text-gray-400 line-through">
    ${pricing.basePrice.toFixed(2)}
  </span>
) : null}
```

Path: `frontend/app/products/page.js`
```jsx
const pricing = getPricing(product);
const showDiscount = pricing.discountActive && pricing.basePrice > pricing.discountedPrice;
```

Path: `frontend/app/components/customer/CustomerView.js`
```jsx
const pricing = getPricing(product);
```

### Cart and checkout calculations use discounted price
Path: `frontend/app/components/customer/cart/page.js`
```jsx
const pricing = getPricing(item.product || { price: item.unit_price });
return {
  price: pricing.discountedPrice,
  originalPrice: pricing.basePrice,
  discountPercent: pricing.discountPercent,
  discountActive: pricing.discountActive,
};
```

Path: `frontend/app/components/customer/checkout/page.js`
```jsx
const pricing = getPricing(item.product || { price: item.unit_price });
return {
  price: pricing.discountedPrice,
  originalPrice: pricing.basePrice,
  discountPercent: pricing.discountPercent,
  discountActive: pricing.discountActive,
};
```

### Guest cart uses discounted price at add time
Path: `frontend/app/productDetails/[id]/page.js`
```jsx
addGuestItem({
  id: product.id,
  name: product.name,
  price: pricing.discountedPrice,
  image: product.image_url || product.image,
}, 1);
```

Path: `frontend/app/products/page.js`
```jsx
const pricing = getPricing(product);
addGuestItem({
  id: product.id,
  name: product.name,
  price: pricing.discountedPrice,
  image: product.image || product.image_url,
}, 1);
```

## Behavior Summary
- Admin sets discount percent and optional start/end dates per product.
- Backend calculates active discount using dates and percent; discounted price applied at checkout.
- Orders store `original_unit_price` and `discount_percent` per item (orders only).
- Frontend displays strike-through original price and discounted price when active.

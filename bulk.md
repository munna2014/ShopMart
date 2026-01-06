# Bulk Product Upload

This project does not include a built-in bulk upload endpoint, but you can bulk add products quickly using the existing **admin product API** with a small script or CSV-to-API approach.

## Option A: Node.js bulk uploader (recommended)

1) Create a file `bulk-products.json` in the project root:

```json
[
  {
    "name": "Classic Tee",
    "description": "Soft cotton t-shirt",
    "price": 12.99,
    "stock_quantity": 50,
    "category_id": 1,
    "sku": "TEE-001",
    "color": "Blue",
    "brand": "ShopMart",
    "size": "M",
    "weight": "200g",
    "dimensions": "30x20x2 cm",
    "highlight_1": "Breathable fabric",
    "highlight_2": "Everyday comfort",
    "highlight_3": "Easy to wash",
    "highlight_4": "Unisex fit",
    "image_url": "https://example.com/images/tee.jpg",
    "discount_percent": 10,
    "discount_starts_at": "2026-01-10",
    "discount_ends_at": "2026-01-31"
  },
  {
    "name": "Minimal Mug",
    "description": "Ceramic coffee mug",
    "price": 6.50,
    "stock_quantity": 80,
    "category_id": 2,
    "sku": "MUG-010",
    "color": "White",
    "brand": "HomeLine",
    "size": "350ml",
    "weight": "350g",
    "dimensions": "10x9x9 cm",
    "highlight_1": "Microwave safe",
    "highlight_2": "Dishwasher friendly",
    "highlight_3": "Scratch resistant",
    "highlight_4": "Classic shape",
    "image_url": "https://example.com/images/mug.jpg"
  }
]
```

2) Create `scripts/bulk-upload.js`:

```js
const fs = require("fs");
const axios = require("axios");

const API_BASE = "http://localhost:8000/api";
const TOKEN = process.env.SHOPMART_TOKEN; // admin token

if (!TOKEN) {
  console.error("Missing SHOPMART_TOKEN env var.");
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync("bulk-products.json", "utf8"));

const run = async () => {
  for (const product of products) {
    try {
      const res = await axios.post(`${API_BASE}/admin/products`, product, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
        },
      });
      console.log("Created:", res.data?.data?.id || res.data?.id || product.name);
    } catch (err) {
      console.error("Failed:", product.name, err.response?.data || err.message);
    }
  }
};

run();
```

3) Run it:

```bash
set SHOPMART_TOKEN=YOUR_ADMIN_TOKEN
node scripts/bulk-upload.js
```

## Option B: CSV -> API (manual)

1) Make a CSV (`bulk-products.csv`) with columns:

```
name,description,price,stock_quantity,category_id,sku,color,material,brand,size,weight,dimensions,highlight_1,highlight_2,highlight_3,highlight_4,discount_percent,discount_starts_at,discount_ends_at,image_url
```

2) Convert CSV to JSON, then use the script above to post each row.

## Option C: Pure SQL bulk insert

Run this against the `products` table (adjust `category_id` to valid IDs, and remove columns you don?t want):

```sql
INSERT INTO products (
  name,
  sku,
  description,
  price,
  currency,
  stock_quantity,
  image_url,
  is_active,
  category_id,
  color,
  material,
  brand,
  size,
  weight,
  dimensions,
  highlight_1,
  highlight_2,
  highlight_3,
  highlight_4,
  discount_percent,
  discount_starts_at,
  discount_ends_at,
  created_at,
  updated_at
) VALUES
(
  'Classic Tee',
  'TEE-001',
  'Soft cotton t-shirt',
  12.99,
  'USD',
  50,
  'https://example.com/images/tee.jpg',
  1,
  1,
  'Blue',
  NULL,
  'ShopMart',
  'M',
  '200g',
  '30x20x2 cm',
  'Breathable fabric',
  'Everyday comfort',
  'Easy to wash',
  'Unisex fit',
  10.00,
  '2026-01-10 00:00:00',
  '2026-01-31 23:59:59',
  NOW(),
  NOW()
),
(
  'Minimal Mug',
  'MUG-010',
  'Ceramic coffee mug',
  6.50,
  'USD',
  80,
  'https://example.com/images/mug.jpg',
  1,
  2,
  'White',
  NULL,
  'HomeLine',
  '350ml',
  '350g',
  '10x9x9 cm',
  'Microwave safe',
  'Dishwasher friendly',
  'Scratch resistant',
  'Classic shape',
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
);
```

## Notes
- The API endpoint is `POST /api/admin/products`.
- If you upload images, switch to multipart form data. For bulk scripts, use `image_url` for speed.
- Discounts are optional; omit fields if you don?t need them.
- Category IDs must exist in the database.


# Database Schema Summary

## Overview

This document summarizes all database tables, migrations, and models created for the e-commerce application.

## Tables Created

### 1. **Authentication & Authorization**

#### `users`

-   **Purpose**: Store user accounts
-   **Key Fields**: email, password_hash, full_name, is_active, last_login_at
-   **Model**: `App\Models\User`
-   **Migration**: `2025_12_17_091201_create_users_table.php`

#### `roles`

-   **Purpose**: Define user roles (e.g., admin, customer, vendor)
-   **Key Fields**: name, description
-   **Model**: `App\Models\Role`
-   **Migration**: `2025_12_17_091202_create_roles_table.php`

#### `permissions`

-   **Purpose**: Define granular permissions
-   **Key Fields**: name, description
-   **Model**: `App\Models\Permission`
-   **Migration**: `2025_12_17_091203_create_permissions_table.php`

#### `user_roles`

-   **Purpose**: Many-to-many relationship between users and roles
-   **Key Fields**: user_id, role_id, assigned_at
-   **Migration**: `2025_12_17_091204_create_user_roles_table.php`

#### `role_permissions`

-   **Purpose**: Many-to-many relationship between roles and permissions
-   **Key Fields**: role_id, permission_id, granted_at
-   **Migration**: `2025_12_17_091205_create_role_permissions_table.php`

#### `otp_codes`

-   **Purpose**: Store OTP codes for 2FA and password reset
-   **Key Fields**: user_id, code, purpose, expires_at, used_at
-   **Model**: `App\Models\OtpCode`
-   **Migration**: `2025_12_17_091206_create_otp_codes_table.php`

---

### 2. **Catalog Management**

#### `categories`

-   **Purpose**: Product categories with hierarchical support
-   **Key Fields**: name, description, parent_id (self-referencing)
-   **Model**: `App\Models\Category`
-   **Migration**: `2025_12_17_091207_create_categories_table.php`
-   **Features**: Supports nested categories, ancestor/descendant methods

#### `products`

-   **Purpose**: Store product information
-   **Key Fields**: name, description, price, currency, stock_quantity, image_url, is_active, category_id
-   **Model**: `App\Models\Product`
-   **Migration**: `2025_12_17_091208_create_products_table.php`
-   **Features**: Fulltext search on name/description, stock management, price tracking

#### `product_images`

-   **Purpose**: Multiple images per product
-   **Key Fields**: product_id, url, alt_text, is_primary
-   **Model**: `App\Models\ProductImage`
-   **Migration**: `2025_12_17_091209_create_product_images_table.php`

#### `price_history`

-   **Purpose**: Track price changes over time
-   **Key Fields**: product_id, old_price, new_price, currency, changed_by, changed_at
-   **Model**: `App\Models\PriceHistory`
-   **Migration**: `2025_12_17_091210_create_price_history_table.php`

---

### 3. **Shopping Cart**

#### `carts`

-   **Purpose**: Shopping carts for users and anonymous sessions
-   **Key Fields**: user_id, session_id, status
-   **Model**: `App\Models\Cart`
-   **Migration**: `2025_12_17_091211_create_carts_table.php`
-   **Features**: Supports both logged-in users and guest sessions

#### `cart_items`

-   **Purpose**: Items in shopping carts
-   **Key Fields**: cart_id, product_id, quantity, unit_price
-   **Model**: `App\Models\CartItem`
-   **Migration**: `2025_12_17_091212_create_cart_items_table.php`

---

### 4. **Orders & Fulfillment**

#### `orders`

-   **Purpose**: Customer orders
-   **Key Fields**: user_id, status, total_amount, currency, shipping_address (JSON)
-   **Model**: `App\Models\Order`
-   **Migration**: `2025_12_17_091213_create_orders_table.php`
-   **Statuses**: PENDING, PAID, SHIPPED, DELIVERED, CANCELLED

#### `order_items`

-   **Purpose**: Line items in orders
-   **Key Fields**: order_id, product_id, quantity, unit_price, total_price
-   **Model**: `App\Models\OrderItem`
-   **Migration**: `2025_12_17_091214_create_order_items_table.php`

#### `shipments`

-   **Purpose**: Shipment tracking
-   **Key Fields**: order_id, carrier, tracking_number, status
-   **Model**: `App\Models\Shipment`
-   **Migration**: `2025_12_17_091215_create_shipments_table.php`
-   **Statuses**: CREATED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, CANCELLED

#### `shipment_events`

-   **Purpose**: Shipment status history
-   **Key Fields**: shipment_id, status, event_time, note, raw_payload (JSON)
-   **Model**: `App\Models\ShipmentEvent`
-   **Migration**: `2025_12_17_091216_create_shipment_events_table.php`

---

### 5. **Localization**

#### `translations`

-   **Purpose**: Multi-language support for products, categories, and UI
-   **Key Fields**: object_type, object_id, field_name, locale, translated_text
-   **Model**: `App\Models\Translation`
-   **Migration**: `2025_12_17_091217_create_translations_table.php`
-   **Supported Types**: PRODUCT, CATEGORY, UI

---

### 6. **Audit & Logging**

#### `audit_log`

-   **Purpose**: Track admin actions and data changes
-   **Key Fields**: actor_user_id, entity_type, entity_id, action, old_data (JSON), new_data (JSON), ip_address
-   **Model**: `App\Models\AuditLog`
-   **Migration**: `2025_12_17_091218_create_audit_log_table.php`

---

## Model Relationships

### User Model

-   `hasMany`: orders, carts, otpCodes, priceChanges, auditLogs
-   `belongsToMany`: roles (through user_roles)
-   **Methods**: `hasRole()`, `hasPermission()`

### Product Model

-   `belongsTo`: category
-   `hasMany`: images, priceHistory, cartItems, orderItems, translations
-   **Methods**: `inStock()`, `decreaseStock()`, `increaseStock()`, `updatePrice()`
-   **Scopes**: `active()`, `inStock()`, `search()`

### Order Model

-   `belongsTo`: user
-   `hasMany`: items, shipments
-   **Methods**: `calculateTotal()`, `updateStatus()`, `createFromCart()`
-   **Scopes**: `pending()`, `paid()`, `shipped()`

### Cart Model

-   `belongsTo`: user
-   `hasMany`: items
-   **Methods**: `getTotal()`, `getTotalItems()`, `addItem()`, `removeItem()`, `clear()`, `markAsCheckedOut()`

### Category Model

-   `belongsTo`: parent (self-referencing)
-   `hasMany`: children, products
-   **Methods**: `ancestors()`, `descendants()`

---

## Key Features

### 1. **Role-Based Access Control (RBAC)**

-   Users can have multiple roles
-   Roles can have multiple permissions
-   Helper methods for checking permissions

### 2. **Multi-Language Support**

-   Translations table supports products, categories, and UI text
-   Helper methods: `getTranslation()`, `setTranslation()`

### 3. **Audit Trail**

-   All significant actions logged with before/after data
-   IP address tracking
-   Automatic logging in Order status changes

### 4. **Price History**

-   Automatic price change tracking
-   Calculate price differences and percentage changes

### 5. **Stock Management**

-   Track inventory levels
-   Methods to increase/decrease stock
-   Prevent overselling with stock checks

### 6. **Hierarchical Categories**

-   Unlimited nesting levels
-   Methods to traverse category tree

### 7. **Guest Shopping**

-   Carts support both authenticated users and session-based guests
-   Easy conversion to user cart upon login

### 8. **Shipment Tracking**

-   Multiple shipments per order
-   Event-based status tracking
-   Support for carrier integration via raw_payload JSON field

---

## Migration Commands

```bash
# Run all pending migrations
docker compose exec app php artisan migrate

# Check migration status
docker compose exec app php artisan migrate:status

# Rollback last batch
docker compose exec app php artisan migrate:rollback

# Reset and re-run all migrations (WARNING: Deletes all data)
docker compose exec app php artisan migrate:fresh

# Run migrations with seed data
docker compose exec app php artisan migrate --seed
```

---

## Next Steps

1. **Create Seeders**: Populate initial data (roles, permissions, categories)
2. **Create Controllers**: Implement API endpoints for each resource
3. **Add Validation**: Create Form Request classes for validation
4. **Implement Policies**: Add authorization policies for each model
5. **Create API Resources**: Transform models for API responses
6. **Add Tests**: Write feature and unit tests

---

## Notes

-   All timestamps use Laravel's default `created_at` and `updated_at`
-   JSON fields are used for flexible data (shipping_address, raw_payload, audit data)
-   Fulltext search is enabled on products (name, description)
-   Foreign key constraints ensure data integrity
-   Soft deletes are not implemented but can be added if needed

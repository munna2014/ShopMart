<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Role;
use App\Models\Permission;
use App\Models\User;

echo "ShopMart Admin Setup\n";
echo "===================\n\n";

// Create roles
$adminRole = Role::firstOrCreate(
    ['name' => 'admin'],
    ['description' => 'Administrator with full access']
);

$customerRole = Role::firstOrCreate(
    ['name' => 'customer'],
    ['description' => 'Regular customer']
);

// Create permissions
$permissions = [
    'view_admin_dashboard' => 'View Admin Dashboard',
    'manage_products' => 'Manage Products',
    'manage_orders' => 'Manage Orders',
    'manage_customers' => 'Manage Customers',
    'shop_products' => 'Shop Products',
    'view_profile' => 'View Profile',
];

foreach ($permissions as $name => $description) {
    Permission::firstOrCreate(
        ['name' => $name],
        ['description' => $description]
    );
}

// Assign permissions to roles
$allPermissions = Permission::all();
$adminRole->permissions()->sync($allPermissions->pluck('id'));

$customerPermissions = Permission::whereIn('name', ['shop_products', 'view_profile'])->get();
$customerRole->permissions()->sync($customerPermissions->pluck('id'));

// Create admin user
$adminUser = User::firstOrCreate(
    ['email' => 'admin@shopmart.com'],
    [
        'full_name' => 'Administrator',
        'password_hash' => bcrypt('admin123'),
        'is_active' => true,
    ]
);

$adminUser->roles()->syncWithoutDetaching([$adminRole->id]);

echo "✅ Admin system setup completed!\n\n";
echo "Admin Login Credentials:\n";
echo "Email: admin@shopmart.com\n";
echo "Password: admin123\n\n";
echo "You can now:\n";
echo "1. Login with admin credentials\n";
echo "2. Access /components/admin page\n";
echo "3. Regular users will be denied access\n";
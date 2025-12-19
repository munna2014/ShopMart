<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;

class RolesAndAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create roles
        $adminRole = Role::create([
            'name' => 'admin',
            'display_name' => 'Administrator',
            'description' => 'Full access to all system features'
        ]);

        $customerRole = Role::create([
            'name' => 'customer',
            'display_name' => 'Customer',
            'description' => 'Regular customer with shopping access'
        ]);

        // Create permissions
        $permissions = [
            ['name' => 'view_admin_dashboard', 'display_name' => 'View Admin Dashboard'],
            ['name' => 'manage_products', 'display_name' => 'Manage Products'],
            ['name' => 'manage_orders', 'display_name' => 'Manage Orders'],
            ['name' => 'manage_customers', 'display_name' => 'Manage Customers'],
            ['name' => 'view_reports', 'display_name' => 'View Reports'],
            ['name' => 'shop_products', 'display_name' => 'Shop Products'],
            ['name' => 'place_orders', 'display_name' => 'Place Orders'],
            ['name' => 'view_profile', 'display_name' => 'View Profile'],
        ];

        foreach ($permissions as $permission) {
            Permission::create($permission);
        }

        // Assign all permissions to admin role
        $adminRole->permissions()->attach(Permission::all());

        // Assign customer permissions to customer role
        $customerPermissions = Permission::whereIn('name', [
            'shop_products', 'place_orders', 'view_profile'
        ])->get();
        $customerRole->permissions()->attach($customerPermissions);

        // Create admin user
        $adminUser = User::create([
            'full_name' => 'Administrator',
            'email' => 'admin@shopmart.com',
            'password_hash' => bcrypt('admin123'),
            'is_active' => true,
        ]);

        // Assign admin role to admin user
        $adminUser->roles()->attach($adminRole);

        echo "Admin user created:\n";
        echo "Email: admin@shopmart.com\n";
        echo "Password: admin123\n";
    }
}

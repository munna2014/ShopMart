<?php

namespace App\Services;

use App\Models\User;
use App\Models\Product;
use App\Models\Category;
use App\Models\Order;
use App\Models\Cart;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * Get comprehensive dashboard statistics
     */
    public function getDashboardStats(): array
    {
        // User statistics
        $totalUsers = User::count();
        $totalCustomers = User::whereHas('roles', function($query) {
            $query->where('name', 'customer');
        })->count();
        
        $totalAdmins = User::whereHas('roles', function($query) {
            $query->where('name', 'admin');
        })->count();

        // Product statistics
        $totalProducts = Product::count();
        $activeProducts = Product::where('is_active', true)->count();
        $inStockProducts = Product::where('stock_quantity', '>', 0)->count();
        $outOfStockProducts = Product::where('stock_quantity', 0)->count();
        
        // Category statistics
        $totalCategories = Category::where('is_active', true)->count();

        // Order statistics (when orders table exists)
        $totalOrders = 0;
        $pendingOrders = 0;
        $completedOrders = 0;
        $totalRevenue = 0;
        $monthlyRevenue = 0;

        // Check if orders table exists
        if ($this->tableExists('orders')) {
            $totalOrders = Order::count();
            $pendingOrders = Order::where('status', 'PENDING')->count();
            $completedOrders = Order::where('status', 'DELIVERED')->count();
            
            // Calculate revenue
            $totalRevenue = Order::where('status', 'DELIVERED')
                ->sum('total_amount') ?? 0;
            
            $monthlyRevenue = Order::where('status', 'DELIVERED')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('total_amount') ?? 0;
        }

        // Cart statistics
        $activeCarts = 0;
        $totalCartItems = 0;
        
        if ($this->tableExists('carts')) {
            $activeCarts = Cart::whereHas('items')->count();
            $totalCartItems = DB::table('cart_items')->sum('quantity') ?? 0;
        }

        // Recent activity (last 30 days)
        $recentUsers = User::where('created_at', '>=', now()->subDays(30))->count();
        $recentProducts = Product::where('created_at', '>=', now()->subDays(30))->count();

        // Growth calculations
        $previousMonthUsers = User::whereBetween('created_at', [
            now()->subMonths(2)->startOfMonth(),
            now()->subMonth()->endOfMonth()
        ])->count();
        
        $currentMonthUsers = User::whereBetween('created_at', [
            now()->startOfMonth(),
            now()->endOfMonth()
        ])->count();
        
        $userGrowthRate = $previousMonthUsers > 0 
            ? (($currentMonthUsers - $previousMonthUsers) / $previousMonthUsers) * 100 
            : 0;

        return [
            // Main stats
            'total_users' => $totalUsers,
            'total_customers' => $totalCustomers,
            'total_admins' => $totalAdmins,
            'total_products' => $totalProducts,
            'total_orders' => $totalOrders,
            'total_revenue' => $totalRevenue,
            
            // Formatted values for display
            'revenue_formatted' => '$' . number_format($totalRevenue, 2),
            'monthly_revenue_formatted' => '$' . number_format($monthlyRevenue, 2),
            
            // Product details
            'active_products' => $activeProducts,
            'in_stock_products' => $inStockProducts,
            'out_of_stock_products' => $outOfStockProducts,
            'total_categories' => $totalCategories,
            
            // Order details
            'pending_orders' => $pendingOrders,
            'completed_orders' => $completedOrders,
            
            // Cart statistics
            'active_carts' => $activeCarts,
            'total_cart_items' => $totalCartItems,
            
            // Recent activity
            'recent_users' => $recentUsers,
            'recent_products' => $recentProducts,
            
            // Growth metrics
            'user_growth_rate' => round($userGrowthRate, 1),
            'current_month_users' => $currentMonthUsers,
            'previous_month_users' => $previousMonthUsers,
            
            // Additional metrics
            'average_order_value' => $totalOrders > 0 ? $totalRevenue / $totalOrders : 0,
            'products_per_category' => $totalCategories > 0 ? round($totalProducts / $totalCategories, 1) : 0,
        ];
    }

    /**
     * Get recent activity for dashboard
     */
    public function getRecentActivity(int $limit = 10): array
    {
        $activities = [];

        // Recent users
        $recentUsers = User::with('roles')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        foreach ($recentUsers as $user) {
            $activities[] = [
                'type' => 'user_registered',
                'message' => "New user {$user->full_name} registered",
                'timestamp' => $user->created_at,
                'icon' => 'user-plus',
                'color' => 'blue'
            ];
        }

        // Recent products
        $recentProducts = Product::with('category')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        foreach ($recentProducts as $product) {
            $activities[] = [
                'type' => 'product_added',
                'message' => "Product '{$product->name}' was added",
                'timestamp' => $product->created_at,
                'icon' => 'package',
                'color' => 'green'
            ];
        }

        // Sort by timestamp and limit
        usort($activities, function($a, $b) {
            return $b['timestamp'] <=> $a['timestamp'];
        });

        return array_slice($activities, 0, $limit);
    }

    /**
     * Check if a table exists in the database
     */
    private function tableExists(string $tableName): bool
    {
        try {
            return DB::getSchemaBuilder()->hasTable($tableName);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get sales data for charts (when orders exist)
     */
    public function getSalesData(int $days = 30): array
    {
        if (!$this->tableExists('orders')) {
            return [
                'labels' => [],
                'data' => [],
                'total' => 0
            ];
        }

        $salesData = Order::where('status', 'DELIVERED')
            ->where('created_at', '>=', now()->subDays($days))
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $labels = [];
        $data = [];
        $total = 0;

        foreach ($salesData as $sale) {
            $labels[] = $sale->date;
            $data[] = $sale->total;
            $total += $sale->total;
        }

        return [
            'labels' => $labels,
            'data' => $data,
            'total' => $total
        ];
    }
}

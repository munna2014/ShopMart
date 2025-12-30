<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function adminIndex(Request $request, DashboardService $dashboardService): JsonResponse
    {
        $stats = $dashboardService->getDashboardStats();
        $recentActivity = $dashboardService->getRecentActivity(5);

        return response()->json([
            'message' => 'Welcome to admin dashboard',
            'user' => $request->user(),
            'stats' => [
                'total_users' => $stats['total_users'],
                'total_customers' => $stats['total_customers'],
                'total_orders' => $stats['total_orders'],
                'total_products' => $stats['total_products'],
                'revenue' => $stats['revenue_formatted'],
                'active_products' => $stats['active_products'],
                'in_stock_products' => $stats['in_stock_products'],
                'out_of_stock_products' => $stats['out_of_stock_products'],
                'pending_orders' => $stats['pending_orders'],
                'completed_orders' => $stats['completed_orders'],
                'monthly_revenue' => $stats['monthly_revenue_formatted'],
                'user_growth_rate' => $stats['user_growth_rate'],
                'recent_users' => $stats['recent_users'],
                'recent_products' => $stats['recent_products'],
            ],
            'recent_activity' => $recentActivity,
            'detailed_stats' => $stats,
        ]);
    }
}

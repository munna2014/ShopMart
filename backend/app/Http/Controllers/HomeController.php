<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class HomeController extends Controller
{
    public function stats(DashboardService $dashboardService): JsonResponse
    {
        $stats = $dashboardService->getDashboardStats();

        return response()->json([
            'total_products' => $stats['total_products'],
            'total_customers' => $stats['total_customers'],
            'total_orders' => $stats['total_orders'],
        ]);
    }
}

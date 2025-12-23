<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/admin/users', function (Request $request) {
    $ordersSummary = [];
    if (\Illuminate\Support\Facades\Schema::hasTable('orders')) {
        $ordersSummary = \Illuminate\Support\Facades\DB::table('orders')
            ->selectRaw('user_id, COUNT(*) as orders_count, COALESCE(SUM(total_amount), 0) as total_spent')
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');
    }

    $users = \App\Models\User::with('roles')
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function($user) use ($ordersSummary) {
            $summary = $ordersSummary[$user->id] ?? null;
            $ordersCount = $summary ? (int) $summary->orders_count : 0;
            $totalSpent = $summary ? (float) $summary->total_spent : 0.0;

            return [
                'id' => $user->id,
                'name' => $user->full_name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
                'joined' => $user->created_at->format('M d, Y'),
                'orders' => $ordersCount,
                'spent' => '$' . number_format($totalSpent, 2),
            ];
        });

    return response()->json(['users' => $users]);
});

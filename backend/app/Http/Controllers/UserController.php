<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class UserController extends Controller
{
    public function adminIndex(): JsonResponse
    {
        $ordersSummary = [];
        if (Schema::hasTable('orders')) {
            $ordersSummary = DB::table('orders')
                ->selectRaw('user_id, COUNT(*) as orders_count, COALESCE(SUM(total_amount), 0) as total_spent')
                ->groupBy('user_id')
                ->get()
                ->keyBy('user_id');
        }

        $users = User::with('roles')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (User $user) use ($ordersSummary) {
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
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account'], 403);
        }

        if ($user->hasRole('admin')) {
            return response()->json(['message' => 'You cannot delete admin users'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}

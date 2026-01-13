<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\OtpCode;
use App\Models\Review;
use App\Models\User;
use App\Models\UserAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function adminIndex(): JsonResponse
    {
        $ordersSummary = [];
        if (Schema::hasTable('orders')) {
            $ordersSummary = DB::table('orders')
                ->selectRaw("user_id, COUNT(*) as orders_count, COALESCE(SUM(CASE WHEN status IN ('PAID','SHIPPED','DELIVERED') THEN total_amount ELSE 0 END), 0) as total_spent")
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

        DB::transaction(function () use ($user) {
            $orderIds = Order::where('user_id', $user->id)->pluck('id');

            CustomerNotification::where('user_id', $user->id)->delete();
            Review::where('user_id', $user->id)->delete();
            UserAddress::where('user_id', $user->id)->delete();
            OtpCode::where('user_id', $user->id)->delete();
            Cart::where('user_id', $user->id)->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            DB::table('audit_log')->where('actor_user_id', $user->id)->delete();

            if ($orderIds->isNotEmpty()) {
                DB::table('audit_log')
                    ->where('entity_type', 'ORDER')
                    ->whereIn('entity_id', $orderIds)
                    ->delete();
            }

            Order::where('user_id', $user->id)->delete();

            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            $user->delete();
        });

        return response()->json(['message' => 'User deleted successfully']);
    }
}

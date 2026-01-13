<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerNotificationController extends Controller
{
    /**
     * List notifications for the authenticated customer.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $notifications = CustomerNotification::where('user_id', $userId)
            ->select(['id', 'order_id', 'title', 'message', 'is_read', 'created_at'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $unreadCount = CustomerNotification::where('user_id', $userId)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'status' => 'success',
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a notification as read.
     */
    public function markRead(Request $request, int $id): JsonResponse
    {
        $notification = CustomerNotification::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        if (!$notification->is_read) {
            $notification->is_read = true;
            $notification->read_at = now();
            $notification->save();
        }

        return response()->json([
            'status' => 'success',
            'notification' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        CustomerNotification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'status' => 'success',
        ]);
    }

    /**
     * Delete a single notification.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $notification = CustomerNotification::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();
        $notification->delete();

        return response()->json([
            'status' => 'success',
        ]);
    }

    /**
     * Delete all notifications for the user.
     */
    public function destroyAll(Request $request): JsonResponse
    {
        CustomerNotification::where('user_id', $request->user()->id)->delete();

        return response()->json([
            'status' => 'success',
        ]);
    }
}

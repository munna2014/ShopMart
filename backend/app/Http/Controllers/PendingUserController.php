<?php

namespace App\Http\Controllers;

use App\Mail\OtpEmail;
use App\Models\OtpCode;
use App\Models\PendingUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PendingUserController extends Controller
{
    public function index(): JsonResponse
    {
        $otpSummary = DB::table('otp_codes')
            ->selectRaw('pending_user_id, COUNT(*) as otp_count, MAX(created_at) as last_sent_at')
            ->whereNotNull('pending_user_id')
            ->groupBy('pending_user_id')
            ->get()
            ->keyBy('pending_user_id');

        $pendingUsers = PendingUser::orderBy('created_at', 'desc')
            ->get()
            ->map(function (PendingUser $pendingUser) use ($otpSummary) {
                $summary = $otpSummary[$pendingUser->id] ?? null;
                $lastSentAt = $summary?->last_sent_at;

                return [
                    'id' => $pendingUser->id,
                    'name' => $pendingUser->full_name,
                    'email' => $pendingUser->email,
                    'created_at' => $pendingUser->created_at,
                    'expires_at' => $pendingUser->expires_at,
                    'is_expired' => $pendingUser->isExpired(),
                    'otp_count' => $summary ? (int) $summary->otp_count : 0,
                    'last_sent_at' => $lastSentAt,
                ];
            });

        return response()->json([
            'pending_users' => $pendingUsers,
        ]);
    }

    public function resend(int $id): JsonResponse
    {
        $pendingUser = PendingUser::findOrFail($id);

        if ($pendingUser->isExpired()) {
            return response()->json([
                'message' => 'Pending user has expired.',
            ], 422);
        }

        OtpCode::where('pending_user_id', $pendingUser->id)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        OtpCode::create([
            'pending_user_id' => $pendingUser->id,
            'code' => $otp,
            'purpose' => 'GENERAL',
            'expires_at' => now()->addMinutes(2),
        ]);

        $emailSent = true;
        try {
            Mail::to($pendingUser->email)->send(new OtpEmail($otp, $pendingUser->full_name));
        } catch (\Exception $e) {
            $emailSent = false;
            Log::error('Pending resend mail error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'OTP resent to pending user.',
            'email_sent' => $emailSent,
            'debug_otp' => app()->environment('local') ? $otp : null,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $pendingUser = PendingUser::findOrFail($id);

        DB::transaction(function () use ($pendingUser) {
            OtpCode::where('pending_user_id', $pendingUser->id)->delete();
            $pendingUser->delete();
        });

        return response()->json([
            'message' => 'Pending user deleted successfully.',
        ]);
    }
}

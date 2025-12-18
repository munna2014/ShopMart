<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Mail\OtpEmail;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        try {
            $fields = $request->validate([
                'name' => 'required|string',
                'email' => 'required|string|email|unique:users,email|unique:pending_users,email',
                'password' => 'required|string|confirmed'
            ]);

            // Create pending user (NOT in main users table yet)
            $pendingUser = \App\Models\PendingUser::create([
                'full_name' => $fields['name'],
                'email' => $fields['email'],
                'password_hash' => bcrypt($fields['password']),
                'expires_at' => now()->addHours(24) // Expires in 24 hours if not verified
            ]);

            // Generate 6-digit OTP
            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            
            // Store OTP linked to pending user
            \App\Models\OtpCode::create([
                'pending_user_id' => $pendingUser->id,
                'code' => $otp,
                'purpose' => 'GENERAL',
                'expires_at' => now()->addMinutes(2)
            ]);

            // Send OTP email
            try {
                Mail::to($pendingUser->email)->send(new OtpEmail($otp, $pendingUser->full_name));
            } catch (\Exception $e) {
                Log::error('Mail Error: ' . $e->getMessage());
            }

            return response()->json([
                'message' => 'Registration successful. Please check your email for verification code.',
                'email' => $pendingUser->email,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Registration Error: ' . $e->getMessage());
            return response()->json(['message' => 'An internal error occurred.'], 500);
        }
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6'
        ]);

        // First check if it's a pending user
        $pendingUser = \App\Models\PendingUser::where('email', $request->email)->first();
        
        if ($pendingUser) {
            // Check if pending user has expired
            if ($pendingUser->isExpired()) {
                $pendingUser->delete();
                return response()->json(['message' => 'Registration has expired. Please register again.'], 422);
            }

            $otpCode = \App\Models\OtpCode::where('pending_user_id', $pendingUser->id)
                ->where('code', $request->code)
                ->where('purpose', 'GENERAL')
                ->whereNull('used_at')
                ->where('expires_at', '>', now())
                ->first();

            if (!$otpCode) {
                return response()->json(['message' => 'Invalid or expired OTP'], 422);
            }

            $otpCode->markAsUsed();
            
            // Move pending user to main users table
            $user = $pendingUser->moveToUsers();
            
            $token = $user->createToken('myapptoken')->plainTextToken;

            return response()->json([
                'message' => 'Email verified successfully',
                'user' => $user,
                'token' => $token
            ], 200);
        }

        // If not pending user, check existing users (for password reset, etc.)
        $user = \App\Models\User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }
        
        $otpCode = \App\Models\OtpCode::where('user_id', $user->id)
            ->where('code', $request->code)
            ->where('purpose', 'GENERAL')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$otpCode) {
            return response()->json(['message' => 'Invalid or expired OTP'], 422);
        }

        $otpCode->markAsUsed();
        $user->is_active = true;
        $user->save();

        $token = $user->createToken('myapptoken')->plainTextToken;

        return response()->json([
            'message' => 'Email verified successfully',
            'user' => $user,
            'token' => $token
        ], 200);
    }

    public function resendOtp(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        
        // First check if it's a pending user
        $pendingUser = \App\Models\PendingUser::where('email', $request->email)->first();
        
        if ($pendingUser) {
            // Check if pending user has expired
            if ($pendingUser->isExpired()) {
                $pendingUser->delete();
                return response()->json(['message' => 'Registration has expired. Please register again.'], 422);
            }

            // Expire old OTPs for pending user
            \App\Models\OtpCode::where('pending_user_id', $pendingUser->id)
                ->whereNull('used_at')
                ->update(['used_at' => now()]);

            // Generate new OTP
            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            
            \App\Models\OtpCode::create([
                'pending_user_id' => $pendingUser->id,
                'code' => $otp,
                'purpose' => 'GENERAL',
                'expires_at' => now()->addMinutes(2)
            ]);

            // Send OTP email
            try {
                Mail::to($pendingUser->email)->send(new OtpEmail($otp, $pendingUser->full_name));
            } catch (\Exception $e) {
                Log::error('Mail Error: ' . $e->getMessage());
            }

            return response()->json([
                'message' => 'New OTP sent to your email.',
            ], 200);
        }

        // Check existing users
        $user = \App\Models\User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json(['message' => 'Email not found'], 404);
        }
        
        if ($user->is_active) {
            return response()->json(['message' => 'User is already verified'], 422);
        }

        // Expire old OTPs
        \App\Models\OtpCode::where('user_id', $user->id)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        // Generate new OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        \App\Models\OtpCode::create([
            'user_id' => $user->id,
            'code' => $otp,
            'purpose' => 'GENERAL',
            'expires_at' => now()->addMinutes(2)
        ]);

        // Send OTP email
        try {
            Mail::to($user->email)->send(new OtpEmail($otp, $user->full_name));
        } catch (\Exception $e) {
            Log::error('Mail Error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'New OTP sent to your email.',
        ], 200);
    }

    public function login(Request $request)
    {
        $fields = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string'
        ]);

        // Check email
        $user = \App\Models\User::where('email', $fields['email'])->first();

        // Check password
        if (!$user || !\Illuminate\Support\Facades\Hash::check($fields['password'], $user->password)) {
            return response()->json([
                'message' => 'Bad creds'
            ], 401);
        }

        // Check if user is verified
        if (!$user->is_active) {
            return response()->json([
                'message' => 'Please verify your email before logging in.',
                'not_verified' => true
            ], 403);
        }

        $token = $user->createToken('myapptoken')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ], 201);
    }

    public function logout(Request $request)
    {
        auth()->user()->tokens()->delete();

        return [
            'message' => 'Logged out'
        ];
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email'
        ]);

        $user = \App\Models\User::where('email', $request->email)->first();

        if (!$user->is_active) {
            return response()->json(['message' => 'Account not verified. Please complete registration first.'], 422);
        }

        // Expire old password reset OTPs
        \App\Models\OtpCode::where('user_id', $user->id)
            ->where('purpose', 'PASSWORD_RESET')
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        // Generate new OTP for password reset
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        \App\Models\OtpCode::create([
            'user_id' => $user->id,
            'code' => $otp,
            'purpose' => 'PASSWORD_RESET',
            'expires_at' => now()->addMinutes(2)
        ]);

        // Send OTP email
        try {
            Mail::to($user->email)->send(new OtpEmail($otp, $user->full_name, 'Password Reset'));
        } catch (\Exception $e) {
            Log::error('Password Reset Mail Error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Password reset code sent to your email.',
            'email' => $user->email
        ], 200);
    }

    public function verifyResetOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'code' => 'required|string|size:6'
        ]);

        $user = \App\Models\User::where('email', $request->email)->first();
        
        $otpCode = \App\Models\OtpCode::where('user_id', $user->id)
            ->where('code', $request->code)
            ->where('purpose', 'PASSWORD_RESET')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$otpCode) {
            return response()->json(['message' => 'Invalid or expired reset code'], 422);
        }

        // Generate a temporary reset token (valid for 15 minutes)
        $resetToken = bin2hex(random_bytes(32));
        
        // Store reset token in cache or database (using OTP table for simplicity)
        \App\Models\OtpCode::create([
            'user_id' => $user->id,
            'code' => $resetToken,
            'purpose' => 'RESET_TOKEN',
            'expires_at' => now()->addMinutes(15)
        ]);

        // Mark OTP as used
        $otpCode->markAsUsed();

        return response()->json([
            'message' => 'Reset code verified successfully',
            'reset_token' => $resetToken,
            'email' => $user->email
        ], 200);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'reset_token' => 'required|string',
            'password' => 'required|string|min:8|confirmed'
        ]);

        $user = \App\Models\User::where('email', $request->email)->first();
        
        // Verify reset token
        $resetToken = \App\Models\OtpCode::where('user_id', $user->id)
            ->where('code', $request->reset_token)
            ->where('purpose', 'RESET_TOKEN')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$resetToken) {
            return response()->json(['message' => 'Invalid or expired reset token'], 422);
        }

        // Update password
        $user->password_hash = bcrypt($request->password);
        $user->save();

        // Mark reset token as used
        $resetToken->markAsUsed();

        // Revoke all existing tokens for security
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password reset successfully. Please login with your new password.'
        ], 200);
    }
}

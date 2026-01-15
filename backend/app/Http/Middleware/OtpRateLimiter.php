<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;

class OtpRateLimiter
{
    public function handle(Request $request, Closure $next, string $maxAttempts = '3', string $decayMinutes = '15')
    {
        $email = $request->input('email');
        
        if (!$email) {
            return response()->json(['message' => 'Email is required'], 422);
        }

        $key = 'otp_request:' . strtolower($email);
        
        // Check if rate limit exceeded
        if (RateLimiter::tooManyAttempts($key, (int)$maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);
            $minutes = ceil($seconds / 60);
            
            return response()->json([
                'message' => "Too many OTP requests. Please try again in {$minutes} minute(s).",
                'retry_after' => $seconds,
            ], 429);
        }

        // Increment the rate limiter
        RateLimiter::hit($key, (int)$decayMinutes * 60);

        return $next($request);
    }
}

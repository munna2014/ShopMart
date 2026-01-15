<?php

return [
    /*
    |--------------------------------------------------------------------------
    | OTP Configuration
    |--------------------------------------------------------------------------
    |
    | Standard OTP settings for authentication and security
    |
    */

    // OTP expiration time in minutes (industry standard: 2-10 minutes)
    'expiration_minutes' => env('OTP_EXPIRATION_MINUTES', 5),

    // Cooldown period between OTP requests in seconds (industry standard: 30-60 seconds)
    'cooldown_seconds' => env('OTP_COOLDOWN_SECONDS', 60),

    // Rate limit: Maximum OTP requests per time window
    'rate_limit' => [
        'max_attempts' => env('OTP_MAX_ATTEMPTS', 5),
        'decay_minutes' => env('OTP_DECAY_MINUTES', 10),
    ],

    // Auto cleanup expired OTPs (runs via scheduler)
    'auto_cleanup' => env('OTP_AUTO_CLEANUP', true),

    // OTP code length
    'code_length' => 6,

    // Pending user expiration in hours
    'pending_user_expiration_hours' => env('PENDING_USER_EXPIRATION_HOURS', 24),
];

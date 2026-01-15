<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\OtpCode;
use Illuminate\Support\Facades\Log;

class CleanupExpiredOtps extends Command
{
    protected $signature = 'otp:cleanup';
    protected $description = 'Delete expired OTP codes from the database';

    public function handle()
    {
        $deleted = OtpCode::where('expires_at', '<', now())->delete();
        
        $this->info("Cleaned up {$deleted} expired OTP codes.");
        Log::info("OTP Cleanup: Deleted {$deleted} expired codes.");
        
        return 0;
    }
}

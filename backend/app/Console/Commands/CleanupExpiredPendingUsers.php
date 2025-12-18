<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PendingUser;

class CleanupExpiredPendingUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:cleanup-pending';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove expired pending users and their associated OTP codes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $expiredCount = PendingUser::where('expires_at', '<', now())->count();
        
        if ($expiredCount === 0) {
            $this->info('No expired pending users found.');
            return;
        }

        // Delete expired pending users (cascade will handle OTP codes)
        PendingUser::where('expires_at', '<', now())->delete();
        
        $this->info("Cleaned up {$expiredCount} expired pending users.");
    }
}

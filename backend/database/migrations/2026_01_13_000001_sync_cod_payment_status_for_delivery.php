<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('orders')
            ->where(function ($query) {
                $query->where('payment_method', 'COD')
                    ->orWhereNull('payment_method');
            })
            ->where('status', 'DELIVERED')
            ->update([
                'payment_status' => 'PAID',
                'paid_at' => DB::raw('COALESCE(paid_at, NOW())'),
            ]);

        DB::table('orders')
            ->where(function ($query) {
                $query->where('payment_method', 'COD')
                    ->orWhereNull('payment_method');
            })
            ->where('status', 'CANCELLED')
            ->update([
                'payment_status' => 'FAILED',
                'paid_at' => null,
            ]);

        DB::table('orders')
            ->where(function ($query) {
                $query->where('payment_method', 'COD')
                    ->orWhereNull('payment_method');
            })
            ->whereNotIn('status', ['DELIVERED', 'CANCELLED'])
            ->update([
                'payment_status' => 'UNPAID',
                'paid_at' => null,
            ]);
    }

    public function down(): void
    {
        // No rollback for data sync.
    }
};

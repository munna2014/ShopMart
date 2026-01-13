<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->enum('payment_method', ['COD', 'STRIPE'])->default('COD')->after('status');
            $table->enum('payment_status', ['UNPAID', 'PENDING', 'PAID', 'FAILED'])->default('UNPAID')->after('payment_method');
            $table->string('stripe_payment_intent_id')->nullable()->after('payment_status');
            $table->string('stripe_payment_status')->nullable()->after('stripe_payment_intent_id');
            $table->timestamp('paid_at')->nullable()->after('stripe_payment_status');
            $table->index(['payment_method', 'payment_status'], 'idx_orders_payment');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_payment');
            $table->dropColumn([
                'payment_method',
                'payment_status',
                'stripe_payment_intent_id',
                'stripe_payment_status',
                'paid_at',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('customer_notifications', function (Blueprint $table) {
            $table->index(['user_id', 'created_at'], 'idx_customer_notifications_user_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_notifications', function (Blueprint $table) {
            $table->dropIndex('idx_customer_notifications_user_created');
        });
    }
};

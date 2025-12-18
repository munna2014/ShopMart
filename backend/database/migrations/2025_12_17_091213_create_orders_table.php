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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->enum('status', ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])->default('PENDING');
            $table->decimal('total_amount', 18, 2)->default(0.00);
            $table->char('currency', 3)->default('USD');
            $table->json('shipping_address')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'status'], 'idx_orders_user_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};

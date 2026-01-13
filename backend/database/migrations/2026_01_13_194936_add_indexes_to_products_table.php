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
        Schema::table('products', function (Blueprint $table) {
            // Add indexes for faster queries
            $table->index('is_active');
            $table->index('category_id');
            $table->index('created_at');
            $table->index(['is_active', 'created_at']);
            $table->index(['is_active', 'category_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
            $table->dropIndex(['category_id']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['is_active', 'created_at']);
            $table->dropIndex(['is_active', 'category_id']);
        });
    }
};

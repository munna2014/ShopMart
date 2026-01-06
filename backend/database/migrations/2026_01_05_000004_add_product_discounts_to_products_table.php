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
            $table->decimal('discount_percent', 5, 2)->nullable()->after('highlight_4');
            $table->timestamp('discount_starts_at')->nullable()->after('discount_percent');
            $table->timestamp('discount_ends_at')->nullable()->after('discount_starts_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'discount_percent',
                'discount_starts_at',
                'discount_ends_at',
            ]);
        });
    }
};

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
        Schema::table('categories', function (Blueprint $table) {
            $table->string('slug')->unique()->after('name');
            $table->text('icon')->nullable()->after('description'); // SVG path for the icon
            $table->string('color')->nullable()->after('icon'); // Tailwind gradient classes
            $table->boolean('is_active')->default(true)->after('color');
            $table->integer('sort_order')->default(0)->after('is_active');
            $table->timestamp('updated_at')->nullable()->after('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['slug', 'icon', 'color', 'is_active', 'sort_order', 'updated_at']);
        });
    }
};

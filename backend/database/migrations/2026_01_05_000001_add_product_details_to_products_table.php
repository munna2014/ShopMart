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
            $table->string('sku', 100)->nullable()->after('name');
            $table->string('color', 100)->nullable()->after('description');
            $table->string('material', 100)->nullable()->after('color');
            $table->string('brand', 100)->nullable()->after('material');
            $table->string('size', 100)->nullable()->after('brand');
            $table->string('weight', 100)->nullable()->after('size');
            $table->string('dimensions', 150)->nullable()->after('weight');
            $table->string('highlight_1', 255)->nullable()->after('dimensions');
            $table->string('highlight_2', 255)->nullable()->after('highlight_1');
            $table->string('highlight_3', 255)->nullable()->after('highlight_2');
            $table->string('highlight_4', 255)->nullable()->after('highlight_3');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'sku',
                'color',
                'material',
                'brand',
                'size',
                'weight',
                'dimensions',
                'highlight_1',
                'highlight_2',
                'highlight_3',
                'highlight_4',
            ]);
        });
    }
};

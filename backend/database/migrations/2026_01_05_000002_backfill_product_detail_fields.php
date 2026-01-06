<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')->whereNull('sku')->update(['sku' => '']);
        DB::table('products')->whereNull('color')->update(['color' => '']);
        DB::table('products')->whereNull('material')->update(['material' => '']);
        DB::table('products')->whereNull('brand')->update(['brand' => '']);
        DB::table('products')->whereNull('size')->update(['size' => '']);
        DB::table('products')->whereNull('weight')->update(['weight' => '']);
        DB::table('products')->whereNull('dimensions')->update(['dimensions' => '']);
        DB::table('products')->whereNull('highlight_1')->update(['highlight_1' => '']);
        DB::table('products')->whereNull('highlight_2')->update(['highlight_2' => '']);
        DB::table('products')->whereNull('highlight_3')->update(['highlight_3' => '']);
        DB::table('products')->whereNull('highlight_4')->update(['highlight_4' => '']);
    }

    public function down(): void
    {
        DB::table('products')->update([
            'sku' => null,
            'color' => null,
            'material' => null,
            'brand' => null,
            'size' => null,
            'weight' => null,
            'dimensions' => null,
            'highlight_1' => null,
            'highlight_2' => null,
            'highlight_3' => null,
            'highlight_4' => null,
        ]);
    }
};

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
        Schema::create('translations', function (Blueprint $table) {
            $table->id();
            $table->enum('object_type', ['PRODUCT', 'CATEGORY', 'UI']);
            $table->unsignedBigInteger('object_id')->nullable();
            $table->string('field_name', 64)->nullable();
            $table->string('locale', 10);
            $table->text('translated_text');
            $table->timestamp('created_at')->useCurrent();
            
            $table->unique(['object_type', 'object_id', 'field_name', 'locale'], 'uk_translation');
            $table->index('locale', 'idx_translation_locale');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('translations');
    }
};

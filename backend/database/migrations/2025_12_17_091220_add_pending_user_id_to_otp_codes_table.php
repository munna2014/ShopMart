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
        Schema::table('otp_codes', function (Blueprint $table) {
            $table->unsignedBigInteger('pending_user_id')->nullable()->after('user_id');
            $table->foreign('pending_user_id')->references('id')->on('pending_users')->onDelete('cascade');
            
            // Make user_id nullable since we can have either user_id or pending_user_id
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('otp_codes', function (Blueprint $table) {
            $table->dropForeign(['pending_user_id']);
            $table->dropColumn('pending_user_id');
        });
    }
};
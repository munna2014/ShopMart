<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add RESET_TOKEN to the purpose enum
        DB::statement("ALTER TABLE otp_codes MODIFY COLUMN purpose ENUM('LOGIN', 'PASSWORD_RESET', 'GENERAL', 'RESET_TOKEN')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE otp_codes MODIFY COLUMN purpose ENUM('LOGIN', 'PASSWORD_RESET', 'GENERAL')");
    }
};
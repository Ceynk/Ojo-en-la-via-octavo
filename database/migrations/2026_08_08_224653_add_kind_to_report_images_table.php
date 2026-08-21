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
        Schema::table('report_images', function (Blueprint $table) {
            // Plain string, not enum() — SQLite bakes enum() into a table-level CHECK
            // constraint that can't be widened later without rebuilding the table.
            $table->string('kind', 20)->default('reporte');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_images', function (Blueprint $table) {
            $table->dropColumn('kind');
        });
    }
};

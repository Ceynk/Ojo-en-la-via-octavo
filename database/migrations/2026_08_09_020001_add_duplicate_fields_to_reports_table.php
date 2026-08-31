<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->foreignId('possible_duplicate_of')->nullable()->constrained('reports')->nullOnDelete();
            $table->float('duplicate_similarity')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('possible_duplicate_of');
            $table->dropColumn('duplicate_similarity');
        });
    }
};

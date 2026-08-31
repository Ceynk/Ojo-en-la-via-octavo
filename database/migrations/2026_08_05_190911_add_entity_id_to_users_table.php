<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // `users` already has a `role` enum('ciudadano','admin') from the original schema —
        // no new role column needed here, just the link to the entity a user belongs to.
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('entity_id')->nullable()->after('id')
                ->constrained('entities')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('entity_id');
        });
    }
};

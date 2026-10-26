<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Idempotency key generated on the citizen's device. Reports made without signal are
     * queued locally and retried until the server confirms them; this key lets a retry of
     * a report that actually did reach the server return the existing row instead of
     * creating a duplicate (see ReportController::store).
     */
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropUnique(['client_uuid']);
            $table->dropColumn('client_uuid');
        });
    }
};

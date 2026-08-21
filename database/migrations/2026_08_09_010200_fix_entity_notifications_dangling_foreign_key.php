<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Same dangling-foreign-key issue as report_images/comments/report_status_history/
 * notifications: the reports-status-widening migration's rename of `reports` caused
 * SQLite to repoint entity_notifications.report_id at `reports_old`, which no longer
 * exists once that table was dropped. Rebuilds entity_notifications against the current
 * `reports` table, preserving all existing rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::rename('entity_notifications', 'entity_notifications_old');

        Schema::create('entity_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->string('entity_email');
            $table->string('subject');
            $table->text('message');
            $table->string('priority')->default('media');
            $table->string('status')->default('enviada');
            $table->timestamps();
        });

        DB::statement('
            INSERT INTO entity_notifications (id, report_id, entity_email, subject, message, priority, status, created_at, updated_at)
            SELECT id, report_id, entity_email, subject, message, priority, status, created_at, updated_at FROM entity_notifications_old
        ');

        Schema::drop('entity_notifications_old');

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        // Not reversible — this migration only repairs a dangling foreign key reference,
        // there is no meaningful "old" state to roll back to.
    }
};

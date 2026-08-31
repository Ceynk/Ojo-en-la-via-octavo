<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Renaming `reports` (in the status-enum-widening migration) and then `comments` (in the
 * previous fix migration) each caused SQLite to silently repoint `notifications`' foreign
 * keys to follow the rename, then leave them dangling once the renamed table was dropped.
 * This rebuilds `notifications` with both foreign keys correctly pointing at the current,
 * stable `reports` and `comments` tables, preserving all existing rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::rename('notifications', 'notifications_old');

        Schema::table('notifications_old', function (Blueprint $table) {
            $table->dropIndex('notifications_user_id_read_at_index');
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type');
            $table->string('title', 200);
            $table->text('message');
            $table->foreignId('report_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('comment_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
        });

        DB::statement('
            INSERT INTO notifications (id, user_id, actor_id, type, title, message, report_id, comment_id, read_at, created_at, updated_at)
            SELECT id, user_id, actor_id, type, title, message, report_id, comment_id, read_at, created_at, updated_at FROM notifications_old
        ');

        Schema::drop('notifications_old');

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        // Not reversible — this migration only repairs dangling foreign key references,
        // there is no meaningful "old" state to roll back to.
    }
};

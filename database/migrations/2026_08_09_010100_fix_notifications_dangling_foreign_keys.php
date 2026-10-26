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
        // Only SQLite repoints foreign keys on rename; on PostgreSQL/MySQL the status
        // migration alters the column in place, so there is nothing dangling to repair.
        // The SQLite rebuild also turned `type` into a free string (the code now writes
        // types outside the old enum, e.g. 'reporte_invalido') — match that elsewhere.
        if (DB::getDriverName() !== 'sqlite') {
            if (DB::getDriverName() === 'pgsql') {
                // The type-enum rebuild left the CHECK named notifications_type_check1, so
                // drop every CHECK on the table (type is its only one) rather than by name.
                $checks = DB::select("SELECT conname FROM pg_constraint WHERE conrelid = 'notifications'::regclass AND contype = 'c'");
                foreach ($checks as $check) {
                    DB::statement("ALTER TABLE notifications DROP CONSTRAINT \"{$check->conname}\"");
                }
            } else {
                Schema::table('notifications', fn (Blueprint $table) => $table->string('type')->change());
            }

            return;
        }

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

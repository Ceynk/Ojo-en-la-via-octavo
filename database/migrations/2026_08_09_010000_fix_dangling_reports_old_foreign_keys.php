<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The earlier reports-status-enum-widening migration renamed `reports` to `reports_old`,
 * created a new `reports` table, copied the data across, and dropped `reports_old`. SQLite
 * repoints foreign keys in *other* tables to follow a rename, but a brand-new table under the
 * old name isn't the same target — so report_images/comments/report_status_history were left
 * with foreign keys pointing at the now-nonexistent `reports_old`. This rebuilds those three
 * tables with the foreign key corrected back to `reports`, preserving all existing data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::rename('report_images', 'report_images_old');
        Schema::create('report_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('type')->default('image');
            $table->string('kind', 20)->default('reporte');
            $table->timestamps();
        });
        DB::statement('INSERT INTO report_images (id, report_id, path, created_at, updated_at, type, kind)
            SELECT id, report_id, path, created_at, updated_at, type, kind FROM report_images_old');
        Schema::drop('report_images_old');

        Schema::rename('comments', 'comments_old');
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
            $table->string('body');
            $table->boolean('is_edited')->default(false);
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
        });
        DB::statement('INSERT INTO comments (id, report_id, user_id, parent_id, body, is_edited, is_deleted, edited_at, created_at, updated_at)
            SELECT id, report_id, user_id, parent_id, body, is_edited, is_deleted, edited_at, created_at, updated_at FROM comments_old');
        Schema::drop('comments_old');

        Schema::rename('report_status_history', 'report_status_history_old');
        Schema::create('report_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->string('previous_status');
            $table->string('new_status');
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
        DB::statement('INSERT INTO report_status_history (id, report_id, previous_status, new_status, changed_by_user_id, notes, created_at, updated_at)
            SELECT id, report_id, previous_status, new_status, changed_by_user_id, notes, created_at, updated_at FROM report_status_history_old');
        Schema::drop('report_status_history_old');

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        // Not reversible — this migration only repairs a dangling foreign key reference,
        // there is no meaningful "old" state to roll back to.
    }
};

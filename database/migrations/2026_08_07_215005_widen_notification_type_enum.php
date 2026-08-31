<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SQLite bakes enum values into a table-level CHECK constraint that can't be
     * altered in place, so widening the `type` enum means rebuilding the table.
     */
    public function up(): void
    {
        $this->rebuild([
            'comentario',
            'respuesta_comentario',
            'like_reporte',
            'like_comentario',
            'estado_reporte',
            'admin_mensaje',
            'nuevo_reporte_entidad',
            'comentario_entidad',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->rebuild([
            'comentario',
            'respuesta_comentario',
            'like_reporte',
            'like_comentario',
            'estado_reporte',
            'admin_mensaje',
        ]);
    }

    private function rebuild(array $types): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::rename('notifications', 'notifications_old');

        // SQLite index names are unique database-wide and travel with the table on
        // rename, so the old index must be dropped before the new table can reuse it.
        Schema::table('notifications_old', function (Blueprint $table) {
            $table->dropIndex('notifications_user_id_read_at_index');
        });

        Schema::create('notifications', function (Blueprint $table) use ($types) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('type', $types);
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
};

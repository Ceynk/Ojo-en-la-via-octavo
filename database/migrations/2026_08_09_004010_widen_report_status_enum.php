<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SQLite bakes enum values into a table-level CHECK constraint that can't be
     * altered in place, so widening the `status` enum means rebuilding the table
     * (same technique used for notifications.type).
     */
    public function up(): void
    {
        $this->rebuild(['pendiente', 'notificado', 'en_camino', 'en_revision', 'en_proceso', 'resuelto']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->rebuild(['pendiente', 'en_revision', 'notificado', 'resuelto']);
    }

    private function rebuild(array $statuses): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::rename('reports', 'reports_old');

        Schema::create('reports', function (Blueprint $table) use ($statuses) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incident_type_id')->constrained()->restrictOnDelete();
            $table->text('description');
            $table->enum('status', $statuses)->default('pendiente');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('address_text', 300);
            $table->boolean('is_edited')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->foreignId('claimed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();
        });

        DB::statement('
            INSERT INTO reports (id, user_id, incident_type_id, description, status, latitude, longitude, address_text, is_edited, edited_at, claimed_by_user_id, claimed_at, created_at, updated_at)
            SELECT id, user_id, incident_type_id, description, status, latitude, longitude, address_text, is_edited, edited_at, claimed_by_user_id, claimed_at, created_at, updated_at FROM reports_old
        ');

        Schema::drop('reports_old');

        Schema::enableForeignKeyConstraints();
    }
};

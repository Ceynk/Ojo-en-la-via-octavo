<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('type', [
                'comentario',
                'respuesta_comentario',
                'like_reporte',
                'like_comentario',
                'estado_reporte',
                'admin_mensaje',
            ]);
            $table->string('title', 200);
            $table->text('message');
            $table->foreignId('report_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('comment_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
        });

        Schema::create('notification_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_type_id')->constrained()->cascadeOnDelete();
            $table->string('entity_email');
            $table->string('subject_template', 300);
            $table->text('message_template');
            $table->enum('priority', ['alta', 'media', 'baja'])->default('media');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('entity_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rule_id')->nullable()->constrained('notification_rules')->nullOnDelete();
            $table->string('entity_email');
            $table->string('subject', 300);
            $table->text('message');
            $table->enum('priority', ['alta', 'media', 'baja'])->default('media');
            $table->enum('status', ['enviada', 'vista', 'actualizada'])->default('enviada');
            $table->string('token', 64)->unique()->nullable();
            $table->boolean('token_used')->default(false);
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamps();

            $table->index('token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_notifications');
        Schema::dropIfExists('notification_rules');
        Schema::dropIfExists('notifications');
    }
};

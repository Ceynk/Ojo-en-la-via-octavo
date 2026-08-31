<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // entity_notifications is empty (audit trail only, no data to lose) and its
        // magic-link fields (rule_id, token*) are fully retired — rebuilt clean rather
        // than ALTERed, since SQLite requires explicitly dropping the token index before
        // the column can go and this sidesteps that entirely.
        Schema::dropIfExists('entity_notifications');
        Schema::create('entity_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->string('entity_email');
            $table->string('subject', 300);
            $table->text('message');
            $table->enum('priority', ['alta', 'media', 'baja'])->default('media');
            $table->enum('status', ['enviada', 'vista', 'actualizada'])->default('enviada');
            $table->timestamps();
        });

        Schema::dropIfExists('notification_rules');

        // Every status change now goes through an authenticated user (citizen, admin, or
        // entity login) — changed_by_user_id covers all cases, changed_by_entity was only
        // ever used by the retired magic-link flow and has been empty since it launched.
        Schema::table('report_status_history', function (Blueprint $table) {
            $table->dropColumn('changed_by_entity');
        });
    }

    public function down(): void
    {
        Schema::table('report_status_history', function (Blueprint $table) {
            $table->string('changed_by_entity')->nullable();
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

        Schema::dropIfExists('entity_notifications');
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

            $table->index('token');
        });
    }
};

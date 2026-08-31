<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incident_type_id')->constrained()->restrictOnDelete();
            $table->text('description');
            $table->enum('status', ['pendiente', 'en_revision', 'notificado', 'resuelto'])->default('pendiente');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('address_text', 300);
            $table->boolean('is_edited')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
        });

        Schema::create('report_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->timestamps();
        });

        Schema::create('report_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->string('previous_status', 30);
            $table->string('new_status', 30);
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('changed_by_entity')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_status_history');
        Schema::dropIfExists('report_images');
        Schema::dropIfExists('reports');
    }
};

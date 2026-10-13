<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Admin content review (RF-14). Separate from the status lifecycle on purpose: a report
     * keeps flowing to its entity right away, and the admin review runs in parallel —
     * null = not reviewed yet, 'valido' = checked, 'invalido' = hidden from the public map,
     * the entity panel and the operators' queue (the author still sees it, with the reason).
     */
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->string('validation_status', 20)->nullable()->index();
            $table->text('validation_notes')->nullable();
            $table->foreignId('validated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('validated_by_user_id');
            $table->dropIndex(['validation_status']);
            $table->dropColumn(['validation_status', 'validation_notes', 'validated_at']);
        });
    }
};

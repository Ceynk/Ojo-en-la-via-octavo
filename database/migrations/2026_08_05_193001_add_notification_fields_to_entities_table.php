<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entities', function (Blueprint $table) {
            $table->string('subject_template')->nullable()->after('description');
            $table->text('message_template')->nullable()->after('subject_template');
            $table->enum('priority', ['alta', 'media', 'baja'])->default('media')->after('message_template');
        });
    }

    public function down(): void
    {
        Schema::table('entities', function (Blueprint $table) {
            $table->dropColumn(['subject_template', 'message_template', 'priority']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('id');
            $table->string('last_name')->nullable()->after('first_name');
            $table->enum('document_type', ['CC', 'TI', 'CE', 'PA'])->nullable()->after('phone');
            $table->string('document_number')->nullable()->unique()->after('document_type');
            $table->string('address')->nullable()->after('document_number');
            $table->string('neighborhood')->nullable()->after('address');
            $table->date('birth_date')->nullable()->after('neighborhood');
            $table->enum('gender', ['masculino', 'femenino', 'otro', 'prefiero_no_decir'])->nullable()->after('birth_date');
        });

        // Backfill first_name/last_name by splitting the existing `name` column.
        foreach (DB::table('users')->select('id', 'name')->get() as $user) {
            [$first, $last] = array_pad(explode(' ', trim($user->name), 2), 2, '');
            DB::table('users')->where('id', $user->id)->update([
                'first_name' => $first,
                'last_name'  => $last,
            ]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
        });

        foreach (DB::table('users')->select('id', 'first_name', 'last_name')->get() as $user) {
            DB::table('users')->where('id', $user->id)->update([
                'name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
            ]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name', 'last_name', 'document_type', 'document_number',
                'address', 'neighborhood', 'birth_date', 'gender',
            ]);
        });
    }
};

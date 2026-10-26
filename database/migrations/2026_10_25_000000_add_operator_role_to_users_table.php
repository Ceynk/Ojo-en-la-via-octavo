<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The operator role was added in code only: on SQLite `users.role` is an unconstrained
 * VARCHAR, but on PostgreSQL/MySQL the enum from add_entity_role_to_users_table still
 * rejects 'operator'. Same technique as that migration.
 */
return new class extends Migration
{
    private const OLD_VALUES = ['ciudadano', 'admin', 'entity'];
    private const NEW_VALUES = ['ciudadano', 'admin', 'entity', 'operator'];

    public function up(): void
    {
        $this->setAllowedValues(self::NEW_VALUES);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'operator')->update(['role' => 'ciudadano']);

        $this->setAllowedValues(self::OLD_VALUES);
    }

    private function setAllowedValues(array $values): void
    {
        $list = implode(',', array_map(fn ($v) => "'{$v}'", $values));

        match (Schema::getConnection()->getDriverName()) {
            'mysql', 'mariadb' => DB::statement(
                "ALTER TABLE users MODIFY role ENUM({$list}) NOT NULL DEFAULT 'ciudadano'"
            ),
            'pgsql' => (function () use ($list) {
                DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
                DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ({$list}))");
            })(),
            // sqlite: the column is a plain VARCHAR, nothing to alter.
            default => null,
        };
    }
};

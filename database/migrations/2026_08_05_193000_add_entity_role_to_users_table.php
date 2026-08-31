<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const OLD_VALUES = ['ciudadano', 'admin'];
    private const NEW_VALUES = ['ciudadano', 'admin', 'entity'];

    public function up(): void
    {
        $this->setAllowedValues(self::NEW_VALUES);
    }

    public function down(): void
    {
        // Any user already on role='entity' would violate the narrower constraint on
        // rollback — reassign them to 'ciudadano' first so `down()` never fails/loses data.
        DB::table('users')->where('role', 'entity')->update(['role' => 'ciudadano']);

        $this->setAllowedValues(self::OLD_VALUES);
    }

    /**
     * `users.role` was declared with Blueprint::enum(), which Laravel compiles differently
     * per driver — a native ENUM column on MySQL, a CHECK constraint on Postgres, and (as
     * verified against this project's actual sqlite schema) a plain unconstrained VARCHAR
     * on SQLite. Each needs its own way to widen the allowed set without touching existing
     * 'ciudadano'/'admin' rows.
     */
    private function setAllowedValues(array $values): void
    {
        $driver = Schema::getConnection()->getDriverName();
        $list = implode(',', array_map(fn ($v) => "'{$v}'", $values));

        match ($driver) {
            'mysql' => DB::statement(
                "ALTER TABLE users MODIFY role ENUM({$list}) NOT NULL DEFAULT 'ciudadano'"
            ),
            'pgsql' => (function () use ($values) {
                $check = implode(', ', array_map(fn ($v) => "'{$v}'", $values));
                DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
                DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ({$check}))");
            })(),
            // sqlite: Blueprint::enum() has no native/CHECK representation here — the column
            // is just a VARCHAR, so it already accepts any string. Nothing to alter.
            default => null,
        };
    }
};

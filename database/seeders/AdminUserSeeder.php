<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@ojoenlavia.co'],
            [
                'name'     => 'Administrador',
                'phone'    => '3000000000',
                'password' => Hash::make('Admin2024!'),
                'role'     => 'admin',
                'is_active' => true,
            ]
        );
    }
}

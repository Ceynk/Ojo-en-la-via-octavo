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
                'first_name' => 'Administrador',
                'last_name'  => '',
                'phone'      => '3000000000',
                'password'   => Hash::make('12345678!'),
                'role'       => 'admin',
                'is_active'  => true,
            ]
        );
    }
}

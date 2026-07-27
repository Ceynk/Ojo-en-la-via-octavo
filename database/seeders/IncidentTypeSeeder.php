<?php

namespace Database\Seeders;

use App\Models\IncidentType;
use Illuminate\Database\Seeder;

class IncidentTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            'Bache',
            'Inundación',
            'Derrumbe',
            'Semáforo dañado',
            'Alumbrado público',
            'Escombros en vía',
            'Señalización deteriorada',
            'Árbol caído',
            'Hundimiento',
            'Otro',
        ];

        foreach ($types as $name) {
            IncidentType::firstOrCreate(['name' => $name]);
        }
    }
}

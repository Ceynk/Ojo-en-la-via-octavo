<?php

namespace Database\Seeders;

use App\Models\Entity;
use Illuminate\Database\Seeder;

class EntitySeeder extends Seeder
{
    /**
     * Seeds the entity records only. Incident-type assignments (entity_incident_type)
     * are intentionally left out — attach them in a follow-up seeder once the current
     * IncidentType catalog has been reviewed. All entities start inactive; enable them
     * manually once each entity_email/contact has been verified.
     */
    public function run(): void
    {
        $entities = [
            [
                'name' => 'Secretaría de Infraestructura',
                'description' => 'Huecos, malla vial, poda de árboles en zona municipal, obras civiles.',
            ],
            [
                'name' => 'Alborada',
                'description' => 'Alumbrado público.',
            ],
            [
                'name' => 'EAAV',
                'description' => 'Fugas de agua, alcantarillado.',
            ],
            [
                'name' => 'Bioagrícola del Llano',
                'description' => 'Basuras, residuos, escombros.',
            ],
            [
                'name' => 'Secretaría de Movilidad',
                'description' => 'Semáforos, señalización vial.',
            ],
            [
                'name' => 'Secretaría de Medio Ambiente',
                'description' => 'Temas ambientales, árboles en zonas protegidas.',
            ],
            [
                'name' => 'Policía Metropolitana',
                'description' => 'Seguridad, vandalismo.',
            ],
        ];

        foreach ($entities as $entity) {
            Entity::updateOrCreate(
                ['name' => $entity['name']],
                ['description' => $entity['description'], 'is_active' => false],
            );
        }
    }
}

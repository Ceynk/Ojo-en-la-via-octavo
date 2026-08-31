<?php

namespace Tests\Feature;

use App\Jobs\NotifyEntitiesOfReport;
use App\Mail\EntityNotificationMail;
use App\Models\Entity;
use App\Models\IncidentType;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NotifyEntitiesOfReportTest extends TestCase
{
    use RefreshDatabase;

    private function makeEntity(IncidentType $type, string $email): Entity
    {
        $entity = Entity::create([
            'name' => "Entidad {$email}",
            'entity_email' => $email,
            'is_active' => true,
            'subject_template' => 'Nuevo reporte de {tipo}',
            'message_template' => 'Se reportó {descripcion} en {direccion}',
            'priority' => 'media',
        ]);

        $entity->incidentTypes()->attach($type->id);

        return $entity;
    }

    private function reportPayload(IncidentType $type): array
    {
        return [
            'incident_type_id' => $type->id,
            'description'      => 'Hueco grande en la vía',
            'latitude'         => 4.142,
            'longitude'        => -73.6266,
            'address_text'     => 'Calle 1 con Carrera 2',
        ];
    }

    /**
     * (a) A mail failure for one entity must not fail report creation — the citizen still
     * gets a successful response, and the report row exists.
     */
    public function test_report_creation_succeeds_even_if_entity_mailer_fails(): void
    {
        $user = User::factory()->create();
        $type = IncidentType::create(['name' => 'Bache']);
        $this->makeEntity($type, 'infraestructura@example.gov.co');

        // Simulate a broken mailer (e.g. SMTP down) for every Mail::to(...) call.
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('SMTP connection refused'));

        $response = $this->actingAs($user)->post(route('reports.store'), $this->reportPayload($type));

        $response->assertRedirect(route('citizen.home'));
        $this->assertDatabaseHas('reports', [
            'description' => 'Hueco grande en la vía',
            'user_id'     => $user->id,
        ]);
    }

    /**
     * (b) A report matching 2 active entities queues 2 emails, one per entity.
     */
    public function test_dispatches_one_email_per_matching_active_entity(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $type = IncidentType::create(['name' => 'Inundación']);
        $this->makeEntity($type, 'eaav@example.gov.co');
        $this->makeEntity($type, 'infraestructura@example.gov.co');

        $report = Report::create([
            'user_id'          => $user->id,
            'incident_type_id' => $type->id,
            'description'      => 'Calle inundada',
            'status'           => 'pendiente',
            'latitude'         => 4.142,
            'longitude'        => -73.6266,
            'address_text'     => 'Calle 1 con Carrera 2',
        ]);

        NotifyEntitiesOfReport::dispatchSync($report);

        Mail::assertQueued(EntityNotificationMail::class, 2);
        $this->assertSame('notificado', $report->fresh()->status);
        $this->assertDatabaseCount('entity_notifications', 2);
    }

    /**
     * (c) Active entity users must be notified too — they're the ones who can actually
     * log into the panel — in addition to the institutional entity_email.
     */
    public function test_notifies_active_entity_users_in_addition_to_entity_email(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $type = IncidentType::create(['name' => 'Fuga de agua']);
        $entity = $this->makeEntity($type, 'contacto@eaav.example.gov.co');

        $activeStaff = User::factory()->create([
            'entity_id' => $entity->id,
            'role'      => 'entity',
            'email'     => 'staff@eaav.example.gov.co',
            'is_active' => true,
        ]);
        User::factory()->create([
            'entity_id' => $entity->id,
            'role'      => 'entity',
            'email'     => 'inactivo@eaav.example.gov.co',
            'is_active' => false,
        ]);

        $report = Report::create([
            'user_id'          => $user->id,
            'incident_type_id' => $type->id,
            'description'      => 'Fuga en la calle',
            'status'           => 'pendiente',
            'latitude'         => 4.142,
            'longitude'        => -73.6266,
            'address_text'     => 'Calle 1 con Carrera 2',
        ]);

        NotifyEntitiesOfReport::dispatchSync($report);

        Mail::assertQueued(EntityNotificationMail::class, 2);
        Mail::assertQueued(EntityNotificationMail::class, fn ($mail) => $mail->recipientName === $activeStaff->name);
        Mail::assertNotQueued(EntityNotificationMail::class, fn ($mail) => $mail->recipientName === 'inactivo@eaav.example.gov.co');
        $this->assertDatabaseCount('entity_notifications', 2);
        $this->assertSame('notificado', $report->fresh()->status);
    }

    /** An inactive entity, even if its incident type matches, must not be notified. */
    public function test_inactive_entities_are_not_notified(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $type = IncidentType::create(['name' => 'Derrumbe']);
        $entity = $this->makeEntity($type, 'ambiente@example.gov.co');
        $entity->update(['is_active' => false]);

        $report = Report::create([
            'user_id'          => $user->id,
            'incident_type_id' => $type->id,
            'description'      => 'Derrumbe en la vía',
            'status'           => 'pendiente',
            'latitude'         => 4.142,
            'longitude'        => -73.6266,
            'address_text'     => 'Calle 1 con Carrera 2',
        ]);

        NotifyEntitiesOfReport::dispatchSync($report);

        Mail::assertNothingQueued();
        $this->assertSame('pendiente', $report->fresh()->status);
    }
}

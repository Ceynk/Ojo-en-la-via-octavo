<?php

namespace Tests\Feature;

use App\Mail\EntityInviteMail;
use App\Models\Entity;
use App\Models\IncidentType;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EntityPanelTest extends TestCase
{
    use RefreshDatabase;

    private function makeEntityWithType(): array
    {
        $type = IncidentType::create(['name' => 'Bache']);
        $entity = Entity::create([
            'name'         => 'Entidad de vías',
            'entity_email' => 'vias@example.gov.co',
            'is_active'    => true,
            'priority'     => 'media',
        ]);
        $entity->incidentTypes()->attach($type->id);

        return [$entity, $type];
    }

    private function makeEntityUser(Entity $entity): User
    {
        return User::factory()->create([
            'entity_id' => $entity->id,
            'role'      => 'entity',
            'is_active' => true,
        ]);
    }

    public function test_non_entity_user_is_forbidden_from_entity_dashboard(): void
    {
        $user = User::factory()->create(['role' => 'ciudadano']);

        $this->actingAs($user)->get('/entidad/dashboard')->assertForbidden();
    }

    public function test_entity_dashboard_only_lists_reports_for_its_incident_types(): void
    {
        [$entity, $type] = $this->makeEntityWithType();
        $otherType = IncidentType::create(['name' => 'Alumbrado']);
        $entityUser = $this->makeEntityUser($entity);
        $citizen = User::factory()->create();

        $matching = Report::create([
            'user_id' => $citizen->id, 'incident_type_id' => $type->id,
            'description' => 'Hueco', 'status' => 'pendiente',
            'latitude' => 4.1, 'longitude' => -73.6, 'address_text' => 'Calle 1',
        ]);
        Report::create([
            'user_id' => $citizen->id, 'incident_type_id' => $otherType->id,
            'description' => 'Poste dañado', 'status' => 'pendiente',
            'latitude' => 4.1, 'longitude' => -73.6, 'address_text' => 'Calle 2',
        ]);

        $response = $this->actingAs($entityUser)->get('/entidad/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Entity/Dashboard')
            ->has('reports.data', 1)
            ->where('reports.data.0.id', $matching->id)
        );
    }

    public function test_entity_user_cannot_view_report_outside_its_incident_types(): void
    {
        [$entity] = $this->makeEntityWithType();
        $otherType = IncidentType::create(['name' => 'Alumbrado']);
        $entityUser = $this->makeEntityUser($entity);
        $citizen = User::factory()->create();

        $report = Report::create([
            'user_id' => $citizen->id, 'incident_type_id' => $otherType->id,
            'description' => 'Poste dañado', 'status' => 'pendiente',
            'latitude' => 4.1, 'longitude' => -73.6, 'address_text' => 'Calle 2',
        ]);

        $this->actingAs($entityUser)->get("/entidad/reportes/{$report->id}")->assertForbidden();
    }

    public function test_entity_user_can_update_status_and_history_records_the_user(): void
    {
        [$entity, $type] = $this->makeEntityWithType();
        $entityUser = $this->makeEntityUser($entity);
        $citizen = User::factory()->create();

        $report = Report::create([
            'user_id' => $citizen->id, 'incident_type_id' => $type->id,
            'description' => 'Hueco', 'status' => 'pendiente',
            'latitude' => 4.1, 'longitude' => -73.6, 'address_text' => 'Calle 1',
        ]);

        $response = $this->actingAs($entityUser)->post("/entidad/reportes/{$report->id}/estado", [
            'status' => 'en_revision',
            'notes'  => 'Programado para inspección',
        ]);

        $response->assertRedirect();
        $this->assertSame('en_revision', $report->fresh()->status);
        $this->assertDatabaseHas('report_status_history', [
            'report_id'          => $report->id,
            'new_status'         => 'en_revision',
            'changed_by_user_id' => $entityUser->id,
        ]);
    }

    public function test_entity_user_cannot_set_status_back_to_pendiente(): void
    {
        [$entity, $type] = $this->makeEntityWithType();
        $entityUser = $this->makeEntityUser($entity);
        $citizen = User::factory()->create();

        $report = Report::create([
            'user_id' => $citizen->id, 'incident_type_id' => $type->id,
            'description' => 'Hueco', 'status' => 'en_revision',
            'latitude' => 4.1, 'longitude' => -73.6, 'address_text' => 'Calle 1',
        ]);

        $this->actingAs($entityUser)
            ->post("/entidad/reportes/{$report->id}/estado", ['status' => 'pendiente'])
            ->assertSessionHasErrors('status');
    }

    public function test_admin_invite_creates_entity_user_and_queues_invite_email_with_reset_token(): void
    {
        Mail::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        $entity = Entity::create(['name' => 'Entidad X', 'is_active' => false, 'priority' => 'media']);

        $response = $this->actingAs($admin)->post("/admin/entities/{$entity->id}/users", [
            'first_name' => 'Ana', 'last_name' => 'Ruiz',
            'email'      => 'ana.ruiz@example.gov.co',
            'phone'      => '3001234567',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'email'     => 'ana.ruiz@example.gov.co',
            'role'      => 'entity',
            'entity_id' => $entity->id,
        ]);

        Mail::assertQueued(EntityInviteMail::class, function (EntityInviteMail $mail) {
            $record = DB::table('password_reset_tokens')->where('email', 'ana.ruiz@example.gov.co')->first();

            return $record !== null && Hash::check($mail->token, $record->token);
        });
    }
}

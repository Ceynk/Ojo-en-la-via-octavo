<?php

namespace Tests\Feature;

use App\Models\IncidentType;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Reports made without signal are queued on the device and re-sent later
 * (resources/js/lib/offlineReports.ts). These cover the server side of that contract.
 */
class OfflineReportSyncTest extends TestCase
{
    use RefreshDatabase;

    private function payload(IncidentType $type, array $extra = []): array
    {
        return array_merge([
            'incident_type_id' => $type->id,
            'description'      => 'Hueco grande en la vía',
            'latitude'         => 4.142,
            'longitude'        => -73.6266,
            'address_text'     => 'Calle 1 con Carrera 2',
        ], $extra);
    }

    public function test_retrying_the_same_client_uuid_does_not_create_a_duplicate(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $type = IncidentType::create(['name' => 'Bache']);
        $uuid = (string) Str::uuid();

        $first = $this->actingAs($user)->postJson('/reports', $this->payload($type, ['client_uuid' => $uuid]));
        $second = $this->actingAs($user)->postJson('/reports', $this->payload($type, ['client_uuid' => $uuid]));

        $first->assertCreated()->assertJsonPath('client_uuid', $uuid);
        $second->assertCreated()->assertJsonPath('id', $first->json('id'));
        $this->assertSame(1, Report::where('client_uuid', $uuid)->count());
    }

    public function test_offline_created_at_is_kept_when_plausible(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $type = IncidentType::create(['name' => 'Bache']);
        $reportedAt = now()->subHours(3)->startOfSecond();

        $res = $this->actingAs($user)->postJson('/reports', $this->payload($type, [
            'client_uuid'        => (string) Str::uuid(),
            'offline_created_at' => $reportedAt->toIso8601String(),
        ]));

        $res->assertCreated();
        $this->assertTrue(Report::find($res->json('id'))->created_at->equalTo($reportedAt));
    }

    public function test_a_wrong_device_clock_is_ignored_instead_of_rejecting_the_report(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $type = IncidentType::create(['name' => 'Bache']);

        $res = $this->actingAs($user)->postJson('/reports', $this->payload($type, [
            'client_uuid'        => (string) Str::uuid(),
            'offline_created_at' => now()->addDays(2)->toIso8601String(),
        ]));

        $res->assertCreated();
        $this->assertTrue(Report::find($res->json('id'))->created_at->lessThanOrEqualTo(now()));
    }

    public function test_regular_inertia_submit_still_redirects(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $type = IncidentType::create(['name' => 'Bache']);

        $this->actingAs($user)
            ->post('/reports', $this->payload($type, ['client_uuid' => (string) Str::uuid()]))
            ->assertRedirect(route('citizen.home'));
    }

    public function test_another_users_client_uuid_is_not_reused(): void
    {
        Queue::fake();
        $type = IncidentType::create(['name' => 'Bache']);
        $uuid = (string) Str::uuid();

        $this->actingAs(User::factory()->create())
            ->postJson('/reports', $this->payload($type, ['client_uuid' => $uuid]))
            ->assertCreated();

        // The uuid is globally unique, so a second user can't claim it — but they also must
        // not get the first user's report back.
        $res = $this->actingAs(User::factory()->create())
            ->postJson('/reports', $this->payload($type, ['client_uuid' => $uuid]));

        $this->assertNotSame(201, $res->status());
        $this->assertSame(1, Report::where('client_uuid', $uuid)->count());
    }
}

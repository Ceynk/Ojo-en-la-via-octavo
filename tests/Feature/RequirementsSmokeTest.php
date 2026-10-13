<?php

namespace Tests\Feature;

use App\Mail\EntityNotificationMail;
use App\Models\Entity;
use App\Models\IncidentType;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * End-to-end walk through the functional requirements (RF-xx), one role at a time.
 * Each test name points at the requirement(s) it exercises.
 */
class RequirementsSmokeTest extends TestCase
{
    use RefreshDatabase;

    private const LAT = 4.142;
    private const LNG = -73.6266;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Mail::fake();
    }

    private function entityWithType(): array
    {
        $type = IncidentType::create(['name' => 'Bache']);
        $entity = Entity::create([
            'name' => 'Secretaría de Infraestructura', 'entity_email' => 'vias@example.gov.co',
            'is_active' => true, 'priority' => 'alta',
        ]);
        $entity->incidentTypes()->attach($type->id);

        return [$entity, $type];
    }

    private function citizenReport(User $citizen, IncidentType $type, string $status = 'pendiente'): Report
    {
        return Report::create([
            'user_id' => $citizen->id, 'incident_type_id' => $type->id, 'description' => 'Hueco profundo',
            'status' => $status, 'latitude' => self::LAT, 'longitude' => self::LNG, 'address_text' => 'Calle 1',
        ]);
    }

    // ── RF-01 / RF-02 / RF-03 ────────────────────────────────────────────────

    public function test_rf01_register_login_logout_and_inactive_accounts(): void
    {
        $this->post('/register', [
            'first_name' => 'Ana', 'last_name' => 'Pérez', 'phone' => '3001112233', 'email' => 'ana@example.com',
            'document_type' => 'CC', 'document_number' => '123456', 'address' => 'Cra 1', 'neighborhood' => 'Centro',
            'birth_date' => '1990-01-01', 'gender' => 'femenino', 'password' => 'Secreta123', 'password_confirmation' => 'Secreta123',
        ])->assertRedirect(route('citizen.home'));
        $this->assertAuthenticated();

        $this->post('/logout')->assertRedirect(route('login'));
        $this->assertGuest();

        $this->post('/login', ['email' => 'ana@example.com', 'password' => 'Secreta123'])->assertRedirect(route('citizen.home'));
        $this->post('/logout');

        $this->post('/login', ['email' => 'ana@example.com', 'password' => 'mala'])->assertSessionHasErrors('email');

        User::where('email', 'ana@example.com')->update(['is_active' => false]);
        $this->post('/login', ['email' => 'ana@example.com', 'password' => 'Secreta123'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_rf02_citizen_profile_view_and_update(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/perfil')->assertOk();
        $this->actingAs($user)->put('/profile', [
            'first_name' => 'Nuevo', 'last_name' => 'Nombre', 'phone' => '3009998877', 'document_type' => 'CC',
            'document_number' => '999', 'address' => 'Calle 5', 'neighborhood' => 'Barzal',
            'birth_date' => '1995-05-05', 'gender' => 'otro',
        ])->assertSessionHasNoErrors();

        $this->assertSame('Nuevo', $user->fresh()->first_name);
    }

    public function test_rf03_each_role_lands_on_its_panel_and_is_kept_out_of_the_others(): void
    {
        [$entity] = $this->entityWithType();
        $users = [
            'ciudadano' => User::factory()->create(['role' => 'ciudadano']),
            'admin'     => User::factory()->create(['role' => 'admin']),
            'entity'    => User::factory()->create(['role' => 'entity', 'entity_id' => $entity->id]),
            'operator'  => User::factory()->create(['role' => 'operator', 'entity_id' => $entity->id]),
        ];
        $home = ['ciudadano' => '/inicio', 'admin' => '/admin/dashboard', 'entity' => '/entidad/dashboard', 'operator' => '/operador/dashboard'];

        foreach ($users as $role => $user) {
            foreach ($home as $panelRole => $url) {
                if ($panelRole === 'ciudadano') {
                    continue; // the citizen map is reachable by any logged-in user
                }
                $res = $this->actingAs($user)->get($url);
                $role === $panelRole ? $res->assertOk() : $res->assertForbidden();
            }
        }

        $this->post('/logout');
        $this->post('/login', ['email' => $users['operator']->email, 'password' => 'password'])
            ->assertRedirect(route('operator.dashboard'));
    }

    // ── RF-04 / RF-17 / RF-22 ────────────────────────────────────────────────

    public function test_rf04_rf22_admin_manages_users_and_entities(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $citizen = User::factory()->create();
        $type = IncidentType::create(['name' => 'Semáforo dañado']);

        $this->actingAs($admin)->get('/admin/users')->assertOk();
        $this->actingAs($admin)->patch("/admin/users/{$citizen->id}/toggle")->assertRedirect();
        $this->assertFalse((bool) $citizen->fresh()->is_active);

        $this->actingAs($admin)->get('/admin/citizens')->assertOk();
        $this->actingAs($admin)->get("/admin/citizens/{$citizen->id}")->assertOk();

        $this->actingAs($admin)->post('/admin/entities', [
            'name' => 'Movilidad', 'entity_email' => 'movilidad@example.gov.co', 'priority' => 'media',
            'incident_type_ids' => [$type->id],
        ])->assertSessionHasNoErrors();
        $entity = Entity::where('name', 'Movilidad')->firstOrFail();
        $this->assertTrue($entity->incidentTypes()->whereKey($type->id)->exists());

        $this->actingAs($admin)->post("/admin/entities/{$entity->id}/users", [
            'first_name' => 'Laura', 'last_name' => 'Gómez', 'email' => 'laura@movilidad.gov.co', 'phone' => '3105556677',
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('users', ['email' => 'laura@movilidad.gov.co', 'entity_id' => $entity->id, 'role' => 'entity']);

        $this->actingAs($admin)->get('/admin/entities')->assertOk();
    }

    public function test_rf17_rf32_rf33_rf34_admin_dashboard_analytics_and_export(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $type = IncidentType::create(['name' => 'Bache']);
        $this->citizenReport(User::factory()->create(), $type);

        $this->actingAs($admin)->get('/admin/dashboard')->assertOk();
        $this->actingAs($admin)->get('/admin/analytics?days=30')->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Analytics/Index')
            ->has('data.reportsByType', 1)
            ->has('data.byStatus')
            ->has('data.trend', 1)
            ->has('data.activeUsers', 1)
        );

        $csv = $this->actingAs($admin)->get('/admin/export/download')->assertOk();
        $this->assertStringContainsString('text/csv', $csv->headers->get('Content-Type'));
        $this->assertStringContainsString('Hueco profundo', $csv->getContent());
    }

    // ── RF-05 / RF-06 / RF-09 / RF-15 / RF-16 / RF-30 ────────────────────────

    public function test_rf05_rf15_rf16_rf30_report_with_media_reaches_the_right_entity(): void
    {
        [$entity, $type] = $this->entityWithType();
        $entityUser = User::factory()->create(['role' => 'entity', 'entity_id' => $entity->id]);
        $otherType = IncidentType::create(['name' => 'Alumbrado']);
        $otherEntity = Entity::create(['name' => 'Alumbrado Público', 'entity_email' => 'luz@example.gov.co', 'is_active' => true, 'priority' => 'media']);
        $otherEntity->incidentTypes()->attach($otherType->id);
        $citizen = User::factory()->create();

        $this->actingAs($citizen)->post('/reports', [
            'incident_type_id' => $type->id, 'description' => 'Hueco en la vía', 'latitude' => self::LAT,
            'longitude' => self::LNG, 'address_text' => 'Calle 1',
            'media' => [UploadedFile::fake()->image('foto.jpg'), UploadedFile::fake()->create('video.mp4', 500, 'video/mp4')],
        ])->assertRedirect(route('citizen.home'));

        $report = Report::latest('id')->firstOrFail();
        $this->assertCount(2, $report->images);
        Storage::disk('public')->assertExists($report->images->first()->path);

        // The queue runs synchronously in tests: the entity for this type was emailed, the other wasn't.
        $this->assertSame('notificado', $report->fresh()->status);
        Mail::assertQueued(EntityNotificationMail::class, fn ($m) => $m->hasTo('vias@example.gov.co'));
        Mail::assertNotQueued(EntityNotificationMail::class, fn ($m) => $m->hasTo('luz@example.gov.co'));
        $this->assertDatabaseHas('notifications', ['user_id' => $entityUser->id, 'type' => 'nuevo_reporte_entidad', 'report_id' => $report->id]);

        // RF-09: detail for the map/list drawer.
        $this->actingAs($citizen)->getJson("/reports/{$report->id}")->assertOk()
            ->assertJsonPath('id', $report->id)->assertJsonCount(2, 'images');
        $this->actingAs($citizen)->getJson('/reports')->assertOk()->assertJsonCount(1);
    }

    public function test_rf05_report_validation(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/reports', ['description' => ''])
            ->assertSessionHasErrors(['incident_type_id', 'description', 'latitude', 'longitude', 'address_text']);
    }

    // ── RF-07 / RF-08 ────────────────────────────────────────────────────────

    public function test_rf07_rf08_ai_endpoints_degrade_gracefully_without_gemini(): void
    {
        config(['gemini.api_key' => '']);
        $type = IncidentType::create(['name' => 'Bache']);
        $citizen = User::factory()->create();

        // Classification assist: no suggestion, but no error either — the form stays manual.
        $this->actingAs($citizen)->post('/reportes/asistente-ia', [
            'description' => 'Hueco', 'photo' => UploadedFile::fake()->image('foto.jpg'),
        ])->assertOk()->assertJsonPath('suggested_incident_type_id', null);

        // Duplicate check: answers (possibly empty) instead of blocking the submit.
        $this->actingAs($citizen)->post('/reportes/verificar-duplicados', [
            'description' => 'Hueco', 'incident_type_id' => $type->id, 'latitude' => self::LAT, 'longitude' => self::LNG,
        ])->assertOk()->assertJsonStructure(['duplicates']);
    }

    // ── RF-11 / RF-12 ────────────────────────────────────────────────────────

    public function test_rf11_rf12_comments_and_support(): void
    {
        $type = IncidentType::create(['name' => 'Bache']);
        $owner = User::factory()->create();
        $neighbor = User::factory()->create();
        $report = $this->citizenReport($owner, $type);

        $this->actingAs($neighbor)->postJson("/reports/{$report->id}/comments", ['body' => 'Sigue igual hoy'])->assertSuccessful();
        $this->actingAs($neighbor)->getJson("/reports/{$report->id}/comments")->assertOk()->assertSee('Sigue igual hoy');

        $this->actingAs($neighbor)->postJson("/reports/{$report->id}/like")->assertOk()->assertJsonPath('likes_count', 1);
        $this->actingAs($neighbor)->postJson("/reports/{$report->id}/like")->assertOk()->assertJsonPath('likes_count', 0);

        $this->actingAs($neighbor)->postJson("/reports/{$report->id}/confirmar-duplicado")->assertSuccessful();
    }

    // ── RF-18 / RF-19 / RF-21 / RF-24 ────────────────────────────────────────

    public function test_rf18_rf19_rf21_entity_panel_and_team(): void
    {
        [$entity, $type] = $this->entityWithType();
        $entityUser = User::factory()->create(['role' => 'entity', 'entity_id' => $entity->id]);
        $report = $this->citizenReport(User::factory()->create(), $type);

        $this->actingAs($entityUser)->get('/entidad/dashboard')->assertOk()
            ->assertInertia(fn ($page) => $page->has('reports.data', 1));
        $this->actingAs($entityUser)->get("/entidad/reportes/{$report->id}")->assertOk()
            ->assertInertia(fn ($page) => $page->component('Entity/Show')->has('report.images')->has('report.status_history'));

        $this->actingAs($entityUser)->post('/entidad/operadores', [
            'first_name' => 'Pedro', 'last_name' => 'Ruiz', 'email' => 'pedro@vias.gov.co', 'phone' => '3201234567',
        ])->assertSessionHasNoErrors();
        $operator = User::where('email', 'pedro@vias.gov.co')->firstOrFail();
        $this->assertSame('operator', $operator->role);
        $this->assertSame($entity->id, $operator->entity_id);

        $this->actingAs($entityUser)->patch("/entidad/operadores/{$operator->id}/toggle")->assertRedirect();
        $this->assertFalse((bool) $operator->fresh()->is_active);

        $this->actingAs($entityUser)->get('/entidad/operadores')->assertOk();
        $this->actingAs($entityUser)->get('/entidad/mapa-operadores')->assertOk();
    }

    // ── RF-23 / RF-24 / RF-25 / RF-26 / RF-27 / RF-28 / RF-29 ────────────────

    public function test_rf23_to_rf29_operator_field_flow_with_geofence_and_evidence(): void
    {
        [$entity, $type] = $this->entityWithType();
        $operator = User::factory()->create(['role' => 'operator', 'entity_id' => $entity->id]);
        $citizen = User::factory()->create();
        $report = $this->citizenReport($citizen, $type, 'notificado');
        $far = ['latitude' => self::LAT + 0.01, 'longitude' => self::LNG];   // ~1.1 km away
        $near = ['latitude' => self::LAT, 'longitude' => self::LNG];

        // RF-23: take the case.
        $this->actingAs($operator)->get('/operador/dashboard')->assertOk()
            ->assertInertia(fn ($page) => $page->has('available', 1));
        $this->actingAs($operator)->post("/operador/reportes/{$report->id}/tomar")->assertRedirect("/operador/reportes/{$report->id}");
        $this->assertSame('en_camino', $report->fresh()->status);
        $this->actingAs($operator)->get("/operador/reportes/{$report->id}")->assertOk();

        // RF-24: location updates are stored (and broadcast); far away doesn't change the status.
        $this->actingAs($operator)->postJson('/operador/ubicacion', $far + ['report_id' => $report->id])->assertOk();
        $this->assertNotNull($operator->fresh()->current_latitude);
        $this->assertSame('en_camino', $report->fresh()->status);

        // Arriving on site flips it to "en revisión" automatically.
        $this->actingAs($operator)->postJson('/operador/ubicacion', $near + ['report_id' => $report->id])->assertOk();
        $this->assertSame('en_revision', $report->fresh()->status);

        // RF-25: can't move forward from far away.
        $this->actingAs($operator)->post("/operador/reportes/{$report->id}/en-proceso", $far)->assertSessionHasErrors('latitude');
        $this->actingAs($operator)->post("/operador/reportes/{$report->id}/en-proceso", $near)->assertSessionHasNoErrors();
        $this->assertSame('en_proceso', $report->fresh()->status);

        // RF-26: resolving needs evidence, and being on site.
        $this->actingAs($operator)->post("/operador/reportes/{$report->id}/resuelto", $near)->assertSessionHasErrors('evidence');
        $this->actingAs($operator)->post("/operador/reportes/{$report->id}/resuelto", $far + [
            'evidence' => [UploadedFile::fake()->image('arreglado.jpg')],
        ])->assertSessionHasErrors('latitude');
        $this->actingAs($operator)->post("/operador/reportes/{$report->id}/resuelto", $near + [
            'evidence' => [UploadedFile::fake()->image('arreglado.jpg')],
        ])->assertSessionHasNoErrors();
        $this->assertSame('resuelto', $report->fresh()->status);
        $this->assertDatabaseHas('report_images', ['report_id' => $report->id, 'kind' => 'evidencia']);

        // RF-27 / RF-28: every transition is in the history, with who did it.
        $history = $report->statusHistory()->orderBy('id')->pluck('new_status')->all();
        $this->assertSame(['en_camino', 'en_revision', 'en_proceso', 'resuelto'], $history);
        $this->assertSame(4, $report->statusHistory()->where('changed_by_user_id', $operator->id)->count());

        // The citizen can read that history from the report detail.
        $this->actingAs($citizen)->getJson("/reports/{$report->id}")->assertOk()->assertJsonCount(4, 'status_history');

        // RF-29: in-app notification for each change (pushed live through the private channel).
        $this->assertSame(4, $citizen->notifications()->where('type', 'estado_reporte')->count());
    }

    public function test_rf23_two_operators_cannot_take_the_same_case(): void
    {
        [$entity, $type] = $this->entityWithType();
        $a = User::factory()->create(['role' => 'operator', 'entity_id' => $entity->id]);
        $b = User::factory()->create(['role' => 'operator', 'entity_id' => $entity->id]);
        $report = $this->citizenReport(User::factory()->create(), $type, 'notificado');

        $this->actingAs($a)->post("/operador/reportes/{$report->id}/tomar");
        $this->actingAs($b)->post("/operador/reportes/{$report->id}/tomar")->assertSessionHas('error');
        $this->assertSame($a->id, $report->fresh()->claimed_by_user_id);
    }

    // ── Gaps closed ──────────────────────────────────────────────────────────

    public function test_rf20_entity_updates_status_but_cannot_close_without_an_operator(): void
    {
        [$entity, $type] = $this->entityWithType();
        $entityUser = User::factory()->create(['role' => 'entity', 'entity_id' => $entity->id]);
        $citizen = User::factory()->create();
        $report = $this->citizenReport($citizen, $type, 'notificado');

        $this->actingAs($entityUser)->get("/entidad/reportes/{$report->id}")->assertOk()
            ->assertInertia(fn ($page) => $page->where('settable_statuses', ['en_revision', 'en_proceso']));

        $this->actingAs($entityUser)->post("/entidad/reportes/{$report->id}/estado", [
            'status' => 'en_proceso', 'notes' => 'Cuadrilla programada',
        ])->assertSessionHasNoErrors();
        $this->assertSame('en_proceso', $report->fresh()->status);
        $this->assertDatabaseHas('report_status_history', [
            'report_id' => $report->id, 'new_status' => 'en_proceso', 'changed_by_user_id' => $entityUser->id, 'notes' => 'Cuadrilla programada',
        ]);
        $this->assertSame(1, $citizen->notifications()->where('type', 'estado_reporte')->count());

        // Closing still needs the operator on site with evidence (RF-25/26).
        $this->actingAs($entityUser)->post("/entidad/reportes/{$report->id}/estado", ['status' => 'resuelto'])
            ->assertSessionHasErrors('status');
        $this->assertSame('en_proceso', $report->fresh()->status);

        // And only for its own incident types.
        $other = $this->citizenReport($citizen, IncidentType::create(['name' => 'Alumbrado']));
        $this->actingAs($entityUser)->post("/entidad/reportes/{$other->id}/estado", ['status' => 'en_revision'])->assertForbidden();
    }

    public function test_rf28_rf29_automatic_notificado_is_recorded_and_notified(): void
    {
        [, $type] = $this->entityWithType();
        $citizen = User::factory()->create();

        $this->actingAs($citizen)->post('/reports', [
            'incident_type_id' => $type->id, 'description' => 'Hueco', 'latitude' => self::LAT,
            'longitude' => self::LNG, 'address_text' => 'Calle 1',
        ]);
        $report = Report::latest('id')->firstOrFail();

        $this->assertSame('notificado', $report->status);
        $history = $report->statusHistory()->first();
        $this->assertSame('notificado', $history->new_status);
        $this->assertNull($history->changed_by_user_id); // "Sistema"
        $this->assertStringContainsString('Secretaría de Infraestructura', $history->notes);
        $this->assertSame(1, $citizen->notifications()->where('type', 'estado_reporte')->count());
    }

    public function test_rf16_entity_email_links_straight_to_the_report(): void
    {
        [, $type] = $this->entityWithType();
        $this->actingAs(User::factory()->create())->post('/reports', [
            'incident_type_id' => $type->id, 'description' => 'Hueco', 'latitude' => self::LAT,
            'longitude' => self::LNG, 'address_text' => 'Calle 1',
        ]);
        $report = Report::latest('id')->firstOrFail();

        Mail::assertQueued(EntityNotificationMail::class, function (EntityNotificationMail $mail) use ($report) {
            return $mail->content()->with['loginUrl'] === route('entity.reports.show', $report);
        });

        // Logged out, that link goes through login and lands back on the report.
        $this->post('/logout');
        $this->get("/entidad/reportes/{$report->id}")->assertRedirect(route('login'));
        $entityUser = User::factory()->create(['role' => 'entity', 'entity_id' => Entity::first()->id]);
        $this->post('/login', ['email' => $entityUser->email, 'password' => 'password'])
            ->assertRedirect("/entidad/reportes/{$report->id}");
    }

    public function test_rf14_admin_validates_and_invalid_reports_leave_the_public_flow(): void
    {
        [$entity, $type] = $this->entityWithType();
        $admin = User::factory()->create(['role' => 'admin']);
        $author = User::factory()->create();
        $neighbor = User::factory()->create();
        $entityUser = User::factory()->create(['role' => 'entity', 'entity_id' => $entity->id]);
        $operator = User::factory()->create(['role' => 'operator', 'entity_id' => $entity->id]);
        $good = $this->citizenReport($author, $type, 'notificado');
        $spam = $this->citizenReport($author, $type, 'notificado');

        $this->actingAs($admin)->get('/admin/reports?validation=sin_revisar')->assertOk()
            ->assertInertia(fn ($page) => $page->has('reports.data', 2));

        $this->actingAs($admin)->patch("/admin/reports/{$good->id}/validacion", ['validation_status' => 'valido'])
            ->assertSessionHasNoErrors();
        $this->actingAs($admin)->patch("/admin/reports/{$spam->id}/validacion", ['validation_status' => 'invalido'])
            ->assertSessionHasErrors('validation_notes'); // a reason is mandatory
        $this->actingAs($admin)->patch("/admin/reports/{$spam->id}/validacion", [
            'validation_status' => 'invalido', 'validation_notes' => 'La foto no muestra un problema vial',
        ])->assertSessionHasNoErrors();

        $this->assertSame($admin->id, $good->fresh()->validated_by_user_id);
        $this->assertDatabaseHas('notifications', ['user_id' => $author->id, 'type' => 'reporte_invalido', 'report_id' => $spam->id]);

        // Gone from the public map, the entity panel and the operators' queue…
        $this->actingAs($neighbor)->getJson('/reports')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $good->id);
        $this->actingAs($entityUser)->get('/entidad/dashboard')->assertInertia(fn ($page) => $page->has('reports.data', 1));
        $this->actingAs($operator)->get('/operador/dashboard')->assertInertia(fn ($page) => $page->has('available', 1));
        // …but the author still sees their own report.
        $this->actingAs($author)->getJson('/reports')->assertJsonCount(2);

        $this->actingAs($admin)->get('/admin/reports?validation=invalido')
            ->assertInertia(fn ($page) => $page->has('reports.data', 1)->where('reports.data.0.id', $spam->id));
    }

    public function test_rf12_reports_can_be_ranked_by_community_support(): void
    {
        [$entity, $type] = $this->entityWithType();
        $entityUser = User::factory()->create(['role' => 'entity', 'entity_id' => $entity->id]);
        $admin = User::factory()->create(['role' => 'admin']);
        $quiet = $this->citizenReport(User::factory()->create(), $type);
        $backed = $this->citizenReport(User::factory()->create(), $type);
        $newest = $this->citizenReport(User::factory()->create(), $type);

        // $backed: 2 likes + 1 confirmation; $newest: 1 like.
        foreach (User::factory()->count(2)->create() as $u) {
            $this->actingAs($u)->postJson("/reports/{$backed->id}/like");
        }
        $this->actingAs(User::factory()->create())->postJson("/reports/{$backed->id}/confirmar-duplicado");
        $this->actingAs(User::factory()->create())->postJson("/reports/{$newest->id}/like");

        $ids = $this->actingAs($entityUser)->getJson('/reports?sort=support')->json('*.id');
        $this->assertSame([$backed->id, $newest->id, $quiet->id], $ids);

        $this->actingAs($entityUser)->get('/entidad/dashboard?sort=support')
            ->assertInertia(fn ($page) => $page->where('reports.data.0.id', $backed->id)->where('reports.data.0.confirmations_count', 1));
        $this->actingAs($admin)->get('/admin/reports?sort=support')
            ->assertInertia(fn ($page) => $page->where('reports.data.0.id', $backed->id));
    }

    public function test_rf25_geofence_tolerates_normal_gps_error(): void
    {
        [$entity, $type] = $this->entityWithType();
        $operator = User::factory()->create(['role' => 'operator', 'entity_id' => $entity->id]);
        $report = $this->citizenReport(User::factory()->create(), $type, 'notificado');
        $this->actingAs($operator)->post("/operador/reportes/{$report->id}/tomar");

        // ~25 m off (typical phone GPS error) counts as on site; ~110 m does not.
        $this->actingAs($operator)->postJson('/operador/ubicacion', ['latitude' => self::LAT + 0.00022, 'longitude' => self::LNG, 'report_id' => $report->id]);
        $this->assertSame('en_revision', $report->fresh()->status);
        $this->actingAs($operator)->post("/operador/reportes/{$report->id}/en-proceso", ['latitude' => self::LAT + 0.001, 'longitude' => self::LNG])
            ->assertSessionHasErrors('latitude');
    }

    public function test_rf32_statistics_by_zone(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $type = IncidentType::create(['name' => 'Bache']);
        $citizen = User::factory()->create();
        // Two reports a few meters apart (same zone) and one ~2 km away (another zone).
        $this->citizenReport($citizen, $type);
        $this->citizenReport($citizen, $type, 'resuelto');
        Report::create([
            'user_id' => $citizen->id, 'incident_type_id' => $type->id, 'description' => 'Lejos', 'status' => 'pendiente',
            'latitude' => self::LAT + 0.02, 'longitude' => self::LNG, 'address_text' => 'Otra zona',
        ]);

        $this->actingAs($admin)->get('/admin/analytics?days=7')->assertOk()->assertInertia(fn ($page) => $page
            ->has('data.zones', 2)
            ->where('data.zones.0.total', 2)
            ->where('data.zones.0.resolved', 1)
            ->where('data.zones.0.open', 1)
            ->where('data.zones.0.top_type', 'Bache')
        );
    }

    public function test_rf34_export_is_valid_csv_with_every_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $type = IncidentType::create(['name' => 'Bache']);
        $report = $this->citizenReport(User::factory()->create(), $type, 'en_proceso');
        $report->update(['description' => 'Hueco "enorme", con agua']);

        $csv = $this->actingAs($admin)->get('/admin/export/download?status=en_proceso')->assertOk()->getContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv); // Excel reads the accents right
        $rows = array_map('str_getcsv', array_filter(explode("\n", substr($csv, 3))));
        $this->assertCount(2, $rows);
        $this->assertSame('Hueco "enorme", con agua', $rows[1][2]);
        $this->assertSame('en_proceso', $rows[1][3]);
    }

    // ── RF-31 ────────────────────────────────────────────────────────────────

    public function test_rf31_admin_sends_general_notice(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $citizens = User::factory()->count(3)->create();

        $this->actingAs($admin)->get('/admin/notifications')->assertOk();
        $this->actingAs($admin)->post('/admin/notifications/send', [
            'user_ids' => $citizens->pluck('id')->all(), 'title' => 'Cierre vial', 'message' => 'Mañana cierran la Cra 33',
        ])->assertSessionHasNoErrors();

        $this->assertSame(3, \App\Models\Notification::where('type', 'admin_mensaje')->count());
    }
}

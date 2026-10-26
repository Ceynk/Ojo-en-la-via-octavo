<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Invented demo data for Villavicencio: citizens, entities (with their users), reports with
 * photos, status history, comments, likes and notifications.
 *
 * Photos are the bundled files in public/demo/reportes (stored with an absolute "/demo/..."
 * path, which getStorageUrl() passes through). Only inserts — never touches existing rows —
 * and skips itself entirely if the demo citizens already exist.
 *
 * Run: php artisan db:seed --class=DemoDataSeeder
 */
class DemoDataSeeder extends Seeder
{
    private const DEMO_DOMAIN = 'demo.ojoenlavia.co';
    private const PASSWORD = '12345678!';

    private Carbon $now;

    public function run(): void
    {
        if (DB::table('users')->where('email', 'like', '%@' . self::DEMO_DOMAIN)->exists()) {
            $this->command?->warn('Los datos de demostración ya existen; no se insertó nada.');
            return;
        }

        mt_srand(2026);
        $this->now = Carbon::now();

        DB::transaction(function () {
            $adminId = DB::table('users')->where('role', 'admin')->value('id');
            $types = DB::table('incident_types')->pluck('id', 'name');
            $photos = $this->photosByPrefix();

            $citizens = $this->seedCitizens();
            [$entities, $entityUsers] = $this->seedEntities($types);

            $reports = $this->seedReports($citizens, $types, $photos, $entities, $adminId);
            $this->seedComments($reports, $citizens, $entityUsers, $adminId);
            $this->seedLikes($reports, $citizens);
        });

        $this->command?->info('Datos de demostración creados. Contraseña de todos los usuarios demo: ' . self::PASSWORD);
    }

    // ── Users ──────────────────────────────────────────────────────────────

    private function seedCitizens(): array
    {
        $people = [
            ['Laura', 'Gómez Rincón', 'femenino', 'Barzal'],
            ['Andrés', 'Pardo Castillo', 'masculino', 'Centro'],
            ['Valentina', 'Rojas Mora', 'femenino', 'La Esperanza'],
            ['Camilo', 'Herrera Vargas', 'masculino', 'Ciudad Porfía'],
            ['Daniela', 'Cárdenas Ríos', 'femenino', 'Buenos Aires'],
            ['Julián', 'Moreno Baquero', 'masculino', 'El Caudal'],
            ['Sofía', 'Ramírez Torres', 'femenino', 'Villa Julia'],
            ['Santiago', 'Beltrán Ortiz', 'masculino', 'Los Centauros'],
            ['Mariana', 'López Garzón', 'femenino', 'Montecarlo'],
            ['Felipe', 'Acosta Duarte', 'masculino', 'San Benito'],
            ['Paola', 'Castro Velásquez', 'femenino', 'Siete de Agosto'],
            ['Diego', 'Salazar Quintero', 'masculino', 'La Grama'],
        ];

        $password = Hash::make(self::PASSWORD);
        $ids = [];

        foreach ($people as $i => [$first, $last, $gender, $barrio]) {
            $created = $this->now->copy()->subDays(90 - $i * 2)->setTime(mt_rand(7, 21), mt_rand(0, 59));
            $ids[] = DB::table('users')->insertGetId([
                'first_name'      => $first,
                'last_name'       => $last,
                'email'           => $this->slug($first . '.' . explode(' ', $last)[0]) . '@' . self::DEMO_DOMAIN,
                'phone'           => '3' . mt_rand(10, 22) . mt_rand(1000000, 9999999),
                'password'        => $password,
                'role'            => 'ciudadano',
                'is_active'       => true,
                'document_type'   => 'CC',
                'document_number' => (string) mt_rand(1000000000, 1129999999),
                'address'         => 'Calle ' . mt_rand(1, 45) . ' # ' . mt_rand(10, 60) . '-' . mt_rand(10, 99),
                'neighborhood'    => $barrio,
                'birth_date'      => Carbon::create(mt_rand(1975, 2004), mt_rand(1, 12), mt_rand(1, 28))->toDateString(),
                'gender'          => $gender,
                'notify_by_email' => true,
                'email_verified_at' => $created,
                'last_login_at'   => $this->now->copy()->subHours(mt_rand(1, 240)),
                'created_at'      => $created,
                'updated_at'      => $created,
            ]);
        }

        return $ids;
    }

    /** @return array{0: array<string, array>, 1: array<int>} entities keyed by name, entity user ids */
    private function seedEntities($types): array
    {
        $defs = [
            'Secretaría de Infraestructura' => [
                'desc' => 'Huecos, malla vial, hundimientos y obras civiles.',
                'types' => ['Bache', 'Hundimiento', 'Derrumbe'], 'priority' => 'alta',
                'motto' => 'Construyendo una Villavicencio transitable', 'user' => ['Ricardo', 'Mejía Lozano'],
            ],
            'Secretaría de Movilidad' => [
                'desc' => 'Semáforos y señalización vial.',
                'types' => ['Semáforo dañado', 'Señalización deteriorada'], 'priority' => 'alta',
                'motto' => 'Movilidad segura para todos', 'user' => ['Natalia', 'Suárez Peña'],
            ],
            'Alborada' => [
                'desc' => 'Alumbrado público.',
                'types' => ['Alumbrado público'], 'priority' => 'media',
                'motto' => 'Iluminamos tu ciudad', 'user' => ['Óscar', 'Valencia Ruiz'],
            ],
            'EAAV' => [
                'desc' => 'Acueducto, alcantarillado y drenaje de aguas lluvias.',
                'types' => ['Inundación'], 'priority' => 'alta',
                'motto' => 'Agua para la vida', 'user' => ['Claudia', 'Rey Montaño'],
            ],
            'Bioagrícola del Llano' => [
                'desc' => 'Basuras, residuos y escombros.',
                'types' => ['Escombros en vía', 'Otro'], 'priority' => 'media',
                'motto' => 'Una ciudad limpia es tarea de todos', 'user' => ['Hernán', 'Patiño Gil'],
            ],
            'Secretaría de Medio Ambiente' => [
                'desc' => 'Arbolado urbano y zonas protegidas.',
                'types' => ['Árbol caído'], 'priority' => 'baja',
                'motto' => 'Cuidamos lo verde del Llano', 'user' => ['Marcela', 'Ortega Caicedo'],
            ],
        ];

        $password = Hash::make(self::PASSWORD);
        $created = $this->now->copy()->subDays(95);
        $entities = [];
        $entityUsers = [];

        foreach ($defs as $name => $def) {
            $slug = $this->slug($name);
            $email = $slug . '@' . self::DEMO_DOMAIN;

            $values = [
                'description'      => $def['desc'],
                'is_active'        => true,
                'priority'         => $def['priority'],
                'entity_email'     => $email,
                'motto'            => $def['motto'],
                'subject_template' => 'Nuevo reporte ciudadano: {tipo}',
                'message_template' => "Se ha registrado un nuevo reporte de {tipo} en {direccion}.\n\nDescripción: {descripcion}",
                'updated_at'       => $created,
            ];

            // EntitySeeder may already have created it (inactive) — reuse it rather than duplicate.
            $id = DB::table('entities')->where('name', $name)->value('id');
            if ($id) {
                DB::table('entities')->where('id', $id)->update($values);
            } else {
                $id = DB::table('entities')->insertGetId($values + ['name' => $name, 'created_at' => $created]);
            }

            foreach ($def['types'] as $typeName) {
                if (isset($types[$typeName]) && ! DB::table('entity_incident_type')->where(['entity_id' => $id, 'incident_type_id' => $types[$typeName]])->exists()) {
                    DB::table('entity_incident_type')->insert([
                        'entity_id' => $id, 'incident_type_id' => $types[$typeName],
                        'created_at' => $created, 'updated_at' => $created,
                    ]);
                }
            }

            [$first, $last] = $def['user'];
            $userId = DB::table('users')->insertGetId([
                'first_name' => $first,
                'last_name'  => $last,
                'email'      => $this->slug($first) . '.' . $slug . '@' . self::DEMO_DOMAIN,
                'phone'      => '608' . mt_rand(6600000, 6699999),
                'password'   => $password,
                'role'       => 'entity',
                'entity_id'  => $id,
                'is_active'  => true,
                'notify_by_email' => true,
                'email_verified_at' => $created,
                'last_login_at' => $this->now->copy()->subHours(mt_rand(1, 72)),
                'created_at' => $created,
                'updated_at' => $created,
            ]);

            $entities[$name] = ['id' => $id, 'name' => $name, 'email' => $email, 'priority' => $def['priority'], 'types' => $def['types'], 'user' => $userId];
            $entityUsers[] = $userId;
        }

        return [$entities, $entityUsers];
    }

    // ── Reports ────────────────────────────────────────────────────────────

    private function seedReports(array $citizens, $types, array $photos, array $entities, ?int $adminId): array
    {
        // [type, barrio, lat, lng, street, description]
        $rows = [
            ['Bache', 'Barzal', 4.1478, -73.6294, 'Calle 37 # 29-14', 'Hueco profundo en el carril derecho, ya van varias motos que se caen de noche. Mide como un metro de ancho.'],
            ['Bache', 'Centro', 4.1509, -73.6371, 'Carrera 33 # 38-50', 'Bache grande frente al banco, los carros lo esquivan invadiendo el otro carril.'],
            ['Bache', 'La Esperanza', 4.1293, -73.6158, 'Calle 15 Sur # 41-07', 'La vía está llena de huecos después de las lluvias, el más grande está justo en la esquina del colegio.'],
            ['Bache', 'Ciudad Porfía', 4.0946, -73.6627, 'Avenida Principal Porfía # 8-30', 'Hueco en plena avenida, ya le pusieron una llanta encima para avisar pero sigue creciendo.'],
            ['Bache', 'Buenos Aires', 4.1414, -73.6258, 'Carrera 22 # 26-11', 'Hay un hueco tapado con escombros que se volvió a abrir, es peligroso para los ciclistas.'],
            ['Bache', 'Montecarlo', 4.1158, -73.6201, 'Calle 6 # 18-42', 'Varios huecos seguidos en la cuadra, los buses del SIT pasan por aquí todo el día.'],
            ['Inundación', 'El Caudal', 4.1398, -73.6443, 'Carrera 44 # 32-15', 'Cada vez que llueve la calle se inunda hasta la mitad de la llanta, el sumidero está tapado.'],
            ['Inundación', 'Siete de Agosto', 4.1563, -73.6402, 'Calle 42 # 36-20', 'Se represó el agua en la esquina y está entrando a las casas. Urgente revisar el alcantarillado.'],
            ['Inundación', 'Covisán', 4.1248, -73.6338, 'Carrera 40 # 12-55', 'La calle queda como un río con cualquier aguacero, los niños no pueden salir para el colegio.'],
            ['Derrumbe', 'San Benito', 4.1593, -73.6336, 'Vía a Restrepo km 1', 'Se vino parte del talud sobre la vía, solo queda un carril habilitado y no hay señalización.'],
            ['Derrumbe', 'Villa Julia', 4.1478, -73.6388, 'Calle 41 # 40-02', 'Deslizamiento de tierra al lado del caño, ya se llevó parte del andén.'],
            ['Derrumbe', 'La Grama', 4.1502, -73.6433, 'Carrera 46 # 37-18', 'Cayeron piedras grandes a la calle después del aguacero de anoche.'],
            ['Semáforo dañado', 'Centro', 4.1516, -73.6365, 'Carrera 32 con Calle 40', 'El semáforo lleva tres días apagado, en hora pico es un caos y casi hay un choque.'],
            ['Semáforo dañado', 'Barzal', 4.1469, -73.6283, 'Calle 35 con Carrera 28', 'La luz roja no prende, solo funcionan la amarilla y la verde.'],
            ['Semáforo dañado', 'Los Centauros', 4.1333, -73.6212, 'Avenida 40 con Calle 19', 'El semáforo peatonal está caído, parece que lo chocó un camión.'],
            ['Alumbrado público', 'La Esperanza', 4.1287, -73.6166, 'Calle 17 Sur # 39-60', 'Toda la cuadra está oscura desde hace dos semanas, ya han robado a varias personas.'],
            ['Alumbrado público', 'Buenos Aires', 4.1406, -73.6265, 'Carrera 24 # 24-35', 'La lámpara del poste parpadea toda la noche y luego se apaga.'],
            ['Alumbrado público', 'Ciudad Porfía', 4.0938, -73.6635, 'Calle 2 # 9-15 Porfía', 'El parque quedó sin luz, los postes no encienden ninguno.'],
            ['Alumbrado público', 'Montecarlo', 4.1150, -73.6210, 'Carrera 15 # 4-22', 'Poste con el brazo de la lámpara colgando, puede caerle a alguien.'],
            ['Escombros en vía', 'Siete de Agosto', 4.1556, -73.6410, 'Calle 44 # 38-09', 'Dejaron un montón de escombros de una obra en plena vía, ocupa medio carril.'],
            ['Escombros en vía', 'El Caudal', 4.1390, -73.6437, 'Carrera 42 # 30-40', 'Botaron escombros y basura en el separador, ya están saliendo ratas.'],
            ['Escombros en vía', 'Covisán', 4.1241, -73.6345, 'Calle 10 # 41-33', 'Arena y bloques sobre la calle desde hace un mes, nadie los recoge.'],
            ['Señalización deteriorada', 'Villa Julia', 4.1470, -73.6380, 'Calle 40 # 39-70', 'La señal de PARE está doblada y casi no se ve, los carros pasan sin detenerse.'],
            ['Señalización deteriorada', 'Barzal', 4.1484, -73.6300, 'Carrera 30 # 38-12', 'El paso de cebra está totalmente borrado frente a la escuela.'],
            ['Señalización deteriorada', 'San Benito', 4.1585, -73.6345, 'Calle 47 # 33-04', 'Rayaron y torcieron la señal de velocidad máxima de la curva.'],
            ['Árbol caído', 'La Grama', 4.1497, -73.6426, 'Carrera 45 # 36-50', 'Se cayó un árbol grande con la tormenta y está bloqueando toda la calle.'],
            ['Árbol caído', 'Los Centauros', 4.1338, -73.6220, 'Calle 21 # 41-16', 'Árbol caído encima de los cables de energía, hay riesgo eléctrico.'],
            ['Árbol caído', 'Centro', 4.1521, -73.6380, 'Parque Los Libertadores', 'Una rama enorme cayó sobre el andén del parque, no se puede pasar.'],
            ['Hundimiento', 'Ciudad Porfía', 4.0952, -73.6620, 'Carrera 10 # 5-48 Porfía', 'La calzada se está hundiendo, ya se formó un hueco que deja ver la tubería.'],
            ['Hundimiento', 'La Esperanza', 4.1299, -73.6150, 'Calle 14 Sur # 43-21', 'Se hundió el pavimento cerca de la alcantarilla, cada día está más grande.'],
            ['Hundimiento', 'Buenos Aires', 4.1419, -73.6251, 'Carrera 21 # 27-60', 'Hundimiento en la vía al lado del caño, los vecinos pusieron una cinta para que nadie caiga.'],
            ['Otro', 'Montecarlo', 4.1163, -73.6195, 'Calle 8 # 20-14', 'Carro abandonado hace meses ocupando la vía, ya está lleno de basura.'],
            ['Otro', 'Siete de Agosto', 4.1568, -73.6398, 'Carrera 37 # 43-25', 'Muro rayado y lleno de basura en la esquina, se volvió un punto crítico.'],
            ['Bache', 'Covisán', 4.1252, -73.6330, 'Calle 11 # 39-18', 'Hueco grande en la entrada del barrio, los taxis ya no quieren entrar.'],
            ['Inundación', 'Ciudad Porfía', 4.0930, -73.6640, 'Calle 4 # 11-02 Porfía', 'Se inunda la calle y el agua se mete al conjunto, el caño está lleno de basura.'],
            ['Alumbrado público', 'Siete de Agosto', 4.1551, -73.6415, 'Calle 45 # 39-11', 'Tres postes seguidos apagados en la calle principal del barrio.'],
        ];

        $statusPlan = ['resuelto', 'resuelto', 'resuelto', 'resuelto', 'resuelto', 'resuelto', 'resuelto', 'resuelto', 'resuelto',
            'notificado', 'notificado', 'notificado', 'notificado', 'notificado', 'notificado', 'notificado', 'notificado', 'notificado', 'notificado',
            'en_revision', 'en_revision', 'en_revision', 'en_revision', 'en_revision', 'en_revision', 'en_revision',
            'pendiente', 'pendiente', 'pendiente', 'pendiente', 'pendiente', 'pendiente', 'pendiente', 'pendiente', 'pendiente', 'pendiente'];
        shuffle($statusPlan);

        $prefixes = [
            'Bache' => 'bache', 'Inundación' => 'inundacion', 'Derrumbe' => 'derrumbe', 'Semáforo dañado' => 'semaforo',
            'Alumbrado público' => 'alumbrado', 'Escombros en vía' => 'escombros', 'Señalización deteriorada' => 'senalizacion',
            'Árbol caído' => 'arbol', 'Hundimiento' => 'hundimiento', 'Otro' => 'otro',
        ];
        $photoCursor = [];
        $reports = [];

        foreach ($rows as $i => [$typeName, $barrio, $lat, $lng, $street, $description]) {
            $status = $statusPlan[$i];
            $ownerId = $citizens[$i % count($citizens)];
            // Resolved/notified reports are older; pending ones are recent.
            $ageDays = match ($status) {
                'resuelto' => mt_rand(25, 60), 'notificado' => mt_rand(6, 30),
                'en_revision' => mt_rand(2, 10), default => mt_rand(0, 4),
            };
            $created = $this->now->copy()->subDays($ageDays)->setTime(mt_rand(6, 22), mt_rand(0, 59));
            $entity = collect($entities)->first(fn ($e) => in_array($typeName, $e['types'], true));

            $reportId = DB::table('reports')->insertGetId([
                'user_id'          => $ownerId,
                'incident_type_id' => $types[$typeName],
                'description'      => $description,
                'status'           => $status,
                'latitude'         => $lat,
                'longitude'        => $lng,
                'address_text'     => "{$street}, {$barrio}, Villavicencio, Meta",
                'is_edited'        => false,
                'created_at'       => $created,
                'updated_at'       => $created,
            ]);

            // Photos: 1–2 from this incident type's pool, rotating so neighbours differ.
            $pool = $photos[$prefixes[$typeName]] ?? [];
            $count = min(count($pool), mt_rand(1, 2));
            for ($p = 0; $p < $count; $p++) {
                $cursor = $photoCursor[$typeName] = ($photoCursor[$typeName] ?? -1) + 1;
                DB::table('report_images')->insert([
                    'report_id' => $reportId, 'path' => $pool[$cursor % count($pool)],
                    'type' => 'image', 'kind' => 'reporte',
                    'created_at' => $created, 'updated_at' => $created,
                ]);
            }

            $updated = $this->seedStatusTrail($reportId, $status, $created, $ownerId, $typeName, $entity, $adminId, $description, "{$street}, {$barrio}");
            DB::table('reports')->where('id', $reportId)->update(['updated_at' => $updated]);

            $reports[] = ['id' => $reportId, 'owner' => $ownerId, 'created' => $created, 'status' => $status, 'entity' => $entity];
        }

        return $reports;
    }

    /** Writes history + owner/entity notifications for each step up to $status; returns the last step's time. */
    private function seedStatusTrail(int $reportId, string $status, Carbon $created, int $ownerId, string $typeName, ?array $entity, ?int $adminId, string $description, string $address): Carbon
    {
        $labels = ['en_revision' => 'En revisión', 'notificado' => 'Notificado a la entidad', 'resuelto' => 'Resuelto'];
        $steps = array_slice(['en_revision', 'notificado', 'resuelto'], 0, array_search($status, ['pendiente', 'en_revision', 'notificado', 'resuelto'], true));

        $previous = 'pendiente';
        $at = $created->copy();

        foreach ($steps as $step) {
            $at = $at->copy()->addHours(mt_rand(3, $step === 'resuelto' ? 240 : 30));
            if ($at->greaterThan($this->now)) {
                $at = $this->now->copy()->subMinutes(mt_rand(5, 120));
            }

            $notes = match ($step) {
                'en_revision' => 'Reporte validado por el equipo de Ojo en la Vía.',
                'notificado'  => 'Notificado por correo a: ' . ($entity['name'] ?? 'entidad responsable'),
                'resuelto'    => 'La entidad confirmó la intervención en el sitio.',
            };

            DB::table('report_status_history')->insert([
                'report_id' => $reportId, 'previous_status' => $previous, 'new_status' => $step,
                'changed_by_user_id' => $step === 'notificado' ? null : $adminId,
                'notes' => $notes, 'created_at' => $at, 'updated_at' => $at,
            ]);

            DB::table('notifications')->insert([
                'user_id' => $ownerId, 'actor_id' => $step === 'notificado' ? null : $adminId,
                'type' => 'estado_reporte', 'title' => 'Estado de reporte actualizado',
                'message' => "Tu reporte de {$typeName} cambió a {$labels[$step]}",
                'report_id' => $reportId,
                'read_at' => $at->diffInDays($this->now) > 3 ? $at->copy()->addHours(mt_rand(1, 20)) : null,
                'created_at' => $at, 'updated_at' => $at,
            ]);

            if ($step === 'notificado' && $entity) {
                DB::table('entity_notifications')->insert([
                    'report_id' => $reportId,
                    'entity_email' => $entity['email'],
                    'subject' => "Nuevo reporte ciudadano: {$typeName}",
                    'message' => "Se ha registrado un nuevo reporte de {$typeName} en {$address}.\n\nDescripción: {$description}",
                    'priority' => $entity['priority'],
                    'status' => $status === 'resuelto' ? 'actualizada' : (mt_rand(0, 1) ? 'vista' : 'enviada'),
                    'created_at' => $at, 'updated_at' => $at,
                ]);

                DB::table('notifications')->insert([
                    'user_id' => $entity['user'], 'actor_id' => null,
                    'type' => 'nuevo_reporte_entidad', 'title' => 'Nuevo reporte asignado',
                    'message' => "Se asignó un nuevo reporte de {$typeName} a {$entity['name']}.",
                    'report_id' => $reportId,
                    'read_at' => $status === 'resuelto' ? $at->copy()->addHours(2) : null,
                    'created_at' => $at, 'updated_at' => $at,
                ]);
            }

            $previous = $step;
        }

        return $at;
    }

    // ── Comments & likes ───────────────────────────────────────────────────

    private function seedComments(array $reports, array $citizens, array $entityUsers, ?int $adminId): void
    {
        $citizenLines = [
            'Confirmo, pasé hoy por ahí y sigue igual.',
            'Esto lleva semanas así, ojalá lo arreglen pronto.',
            'Casi me caigo en la moto por esto, tengan cuidado de noche.',
            'Yo también lo reporté a la alcaldía hace un mes.',
            'Gracias por reportarlo, vivo en la cuadra y es un peligro.',
            'Hoy está peor que ayer con el aguacero.',
            'Los vecinos pusimos una señal improvisada mientras tanto.',
            'Por fin alguien lo reporta 👏',
        ];
        $replyLines = ['Totalmente de acuerdo.', 'Sí, yo vi lo mismo esta mañana.', 'Ojalá respondan rápido.', 'Gracias por la información.'];
        $names = DB::table('users')->whereIn('id', array_merge($citizens, $entityUsers, array_filter([$adminId])))
            ->get(['id', 'first_name', 'last_name'])->mapWithKeys(fn ($u) => [$u->id => trim("{$u->first_name} {$u->last_name}")]);

        foreach ($reports as $r) {
            $n = $r['status'] === 'pendiente' ? mt_rand(0, 2) : mt_rand(1, 4);
            $at = $r['created']->copy();

            for ($c = 0; $c < $n; $c++) {
                $at = $at->copy()->addHours(mt_rand(1, 48));
                if ($at->greaterThan($this->now)) break;

                $authorId = $this->pickOther($citizens, $r['owner']);
                $body = $citizenLines[array_rand($citizenLines)];

                // An official reply on reports the entity already handles.
                if ($c === $n - 1 && $r['entity'] && in_array($r['status'], ['notificado', 'resuelto'], true)) {
                    $authorId = $r['entity']['user'];
                    $body = $r['status'] === 'resuelto'
                        ? 'Buen día. Les informamos que la cuadrilla ya atendió este caso. Gracias por reportar.'
                        : 'Recibimos el reporte, quedó programada una visita técnica esta semana.';
                } elseif ($c === 0 && $r['status'] === 'en_revision' && $adminId) {
                    $authorId = $adminId;
                    $body = 'Estamos validando la información para enviarlo a la entidad responsable.';
                }

                $commentId = DB::table('comments')->insertGetId([
                    'report_id' => $r['id'], 'user_id' => $authorId, 'parent_id' => null, 'body' => $body,
                    'is_edited' => false, 'is_deleted' => false, 'created_at' => $at, 'updated_at' => $at,
                ]);

                if ($authorId !== $r['owner']) {
                    $this->notify($r['owner'], $authorId, 'comentario', 'Nuevo comentario',
                        "{$names[$authorId]} comentó en tu reporte: \"" . mb_strimwidth($body, 0, 80, '...') . '"', $r['id'], $commentId, $at);
                }

                // The report owner sometimes answers.
                if (mt_rand(0, 3) === 0 && $authorId !== $r['owner']) {
                    $replyAt = $at->copy()->addMinutes(mt_rand(20, 600));
                    if ($replyAt->lessThan($this->now)) {
                        $reply = $replyLines[array_rand($replyLines)];
                        DB::table('comments')->insert([
                            'report_id' => $r['id'], 'user_id' => $r['owner'], 'parent_id' => $commentId, 'body' => $reply,
                            'is_edited' => false, 'is_deleted' => false, 'created_at' => $replyAt, 'updated_at' => $replyAt,
                        ]);
                        $this->notify($authorId, $r['owner'], 'respuesta_comentario', 'Nueva respuesta',
                            "{$names[$r['owner']]} respondió tu comentario: \"{$reply}\"", $r['id'], $commentId, $replyAt);
                    }
                }
            }
        }
    }

    private function seedLikes(array $reports, array $citizens): void
    {
        $names = DB::table('users')->whereIn('id', $citizens)->get(['id', 'first_name', 'last_name'])
            ->mapWithKeys(fn ($u) => [$u->id => trim("{$u->first_name} {$u->last_name}")]);

        foreach ($reports as $r) {
            $likers = array_values(array_diff($citizens, [$r['owner']]));
            shuffle($likers);

            foreach (array_slice($likers, 0, mt_rand(0, 7)) as $k => $userId) {
                $at = $r['created']->copy()->addHours(mt_rand(1, 72));
                if ($at->greaterThan($this->now)) $at = $this->now->copy()->subMinutes(mt_rand(1, 60));

                DB::table('likes')->insert([
                    'user_id' => $userId, 'likeable_type' => 'App\\Models\\Report', 'likeable_id' => $r['id'],
                    'created_at' => $at, 'updated_at' => $at,
                ]);
                if ($k < 2) {
                    $this->notify($r['owner'], $userId, 'like_reporte', 'Le gustó tu reporte',
                        "{$names[$userId]} marcó como útil tu reporte.", $r['id'], null, $at);
                }
            }
        }

        // A few likes on comments too.
        $comments = DB::table('comments')->whereIn('report_id', array_column($reports, 'id'))->get(['id', 'user_id']);
        foreach ($comments as $comment) {
            if (mt_rand(0, 2) !== 0) continue;
            $userId = $this->pickOther($citizens, $comment->user_id);
            $at = $this->now->copy()->subHours(mt_rand(1, 200));
            DB::table('likes')->insert([
                'user_id' => $userId, 'likeable_type' => 'App\\Models\\Comment', 'likeable_id' => $comment->id,
                'created_at' => $at, 'updated_at' => $at,
            ]);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function notify(int $userId, ?int $actorId, string $type, string $title, string $message, ?int $reportId, ?int $commentId, Carbon $at): void
    {
        DB::table('notifications')->insert([
            'user_id' => $userId, 'actor_id' => $actorId, 'type' => $type, 'title' => $title, 'message' => $message,
            'report_id' => $reportId, 'comment_id' => $commentId,
            'read_at' => $at->diffInDays($this->now) > 4 ? $at->copy()->addHours(mt_rand(1, 30)) : null,
            'created_at' => $at, 'updated_at' => $at,
        ]);
    }

    /** "/demo/reportes/bache-1.jpg" paths grouped by file prefix ("bache"). */
    private function photosByPrefix(): array
    {
        $groups = [];
        foreach (glob(public_path('demo/reportes/*.jpg')) ?: [] as $file) {
            $name = basename($file);
            $groups[preg_replace('/-\d+\.jpg$/', '', $name)][] = '/demo/reportes/' . $name;
        }
        foreach ($groups as &$list) {
            natsort($list);
            $list = array_values($list);
        }

        return $groups;
    }

    private function pickOther(array $ids, int $exclude): int
    {
        $pool = array_values(array_diff($ids, [$exclude]));

        return $pool[array_rand($pool)];
    }

    private function slug(string $text): string
    {
        return \Illuminate\Support\Str::slug($text, '.');
    }
}

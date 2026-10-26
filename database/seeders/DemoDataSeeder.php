<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Demo data for Villavicencio: citizens, entities (each with a user and a field operator),
 * reports with photos, status history, comments, likes and notifications.
 *
 * Report locations are real points of the city (street and barrio as OpenStreetMap names
 * them), and each report's history follows the app's real lifecycle: notified to the entity,
 * claimed by its operator ("en camino"), on site ("en revisión"), "en proceso", "resuelto".
 *
 * Photos are the bundled files in public/demo/reportes (stored with an absolute "/demo/..."
 * path, which getStorageUrl() passes through).
 *
 * Emails go to <name>@demo.ojoenlavia.co, a domain that doesn't exist. Set DEMO_MAILBOX
 * (e.g. you@gmail.com) to use plus-aliases of a real inbox instead (you+laura.gomez@gmail.com),
 * so the report/resolution emails of a demo land somewhere rather than bouncing.
 *
 * Run: php artisan db:seed --class=DemoDataSeeder
 * On a database that already has the demo data it syncs instead: moves the demo reports to
 * the locations below, rebuilds their status history (comments and likes are kept), adds the
 * operators and any report that is missing. Reports filed by real users are never touched.
 */
class DemoDataSeeder extends Seeder
{
    private const DEMO_DOMAIN = 'demo.ojoenlavia.co';
    private const PASSWORD = '12345678!';

    private const FLOW = ['pendiente', 'notificado', 'en_camino', 'en_revision', 'en_proceso', 'resuelto'];

    // Same wording as NotificationService::notifyStatusChange.
    private const STATUS_LABELS = [
        'notificado'  => 'Notificado a la entidad',
        'en_camino'   => 'Un operador va en camino',
        'en_revision' => 'En revisión',
        'en_proceso'  => 'En proceso',
        'resuelto'    => 'Resuelto',
    ];

    private const PEOPLE = [
        ['Laura', 'Gómez Rincón', 'femenino', 'El Barzal'],
        ['Andrés', 'Pardo Castillo', 'masculino', 'El Centro'],
        ['Valentina', 'Rojas Mora', 'femenino', 'La Esperanza'],
        ['Camilo', 'Herrera Vargas', 'masculino', 'Ciudad Porfía'],
        ['Daniela', 'Cárdenas Ríos', 'femenino', 'Buenos Aires'],
        ['Julián', 'Moreno Baquero', 'masculino', 'El Caudal'],
        ['Sofía', 'Ramírez Torres', 'femenino', 'Villa Julia'],
        ['Santiago', 'Beltrán Ortiz', 'masculino', 'Gaitán'],
        ['Mariana', 'López Garzón', 'femenino', 'Montecarlo'],
        ['Felipe', 'Acosta Duarte', 'masculino', 'El Emporio'],
        ['Paola', 'Castro Velásquez', 'femenino', 'Siete de Agosto'],
        ['Diego', 'Salazar Quintero', 'masculino', 'La Grama'],
    ];

    private const ENTITIES = [
        'Secretaría de Infraestructura' => [
            'desc' => 'Huecos, malla vial, hundimientos y obras civiles.',
            'types' => ['Bache', 'Hundimiento', 'Derrumbe'], 'priority' => 'alta',
            'motto' => 'Construyendo una Villavicencio transitable',
            'user' => ['Ricardo', 'Mejía Lozano'], 'operator' => ['Jorge', 'Vargas Ruiz'],
        ],
        'Secretaría de Movilidad' => [
            'desc' => 'Semáforos y señalización vial.',
            'types' => ['Semáforo dañado', 'Señalización deteriorada'], 'priority' => 'alta',
            'motto' => 'Movilidad segura para todos',
            'user' => ['Natalia', 'Suárez Peña'], 'operator' => ['Edwin', 'Rozo Pineda'],
        ],
        'Alborada' => [
            'desc' => 'Alumbrado público.',
            'types' => ['Alumbrado público'], 'priority' => 'media',
            'motto' => 'Iluminamos tu ciudad',
            'user' => ['Óscar', 'Valencia Ruiz'], 'operator' => ['Wilmer', 'Daza Rubio'],
        ],
        'EAAV' => [
            'desc' => 'Acueducto, alcantarillado y drenaje de aguas lluvias.',
            'types' => ['Inundación'], 'priority' => 'alta',
            'motto' => 'Agua para la vida',
            'user' => ['Claudia', 'Rey Montaño'], 'operator' => ['Fabián', 'Correa León'],
        ],
        'Bioagrícola del Llano' => [
            'desc' => 'Basuras, residuos y escombros.',
            'types' => ['Escombros en vía', 'Otro'], 'priority' => 'media',
            'motto' => 'Una ciudad limpia es tarea de todos',
            'user' => ['Hernán', 'Patiño Gil'], 'operator' => ['Yesid', 'Mora Cifuentes'],
        ],
        'Secretaría de Medio Ambiente' => [
            'desc' => 'Arbolado urbano y zonas protegidas.',
            'types' => ['Árbol caído'], 'priority' => 'baja',
            'motto' => 'Cuidamos lo verde del Llano',
            'user' => ['Marcela', 'Ortega Caicedo'], 'operator' => ['Leidy', 'Gutiérrez Parra'],
        ],
    ];

    private const PHOTO_PREFIXES = [
        'Bache' => 'bache', 'Inundación' => 'inundacion', 'Derrumbe' => 'derrumbe', 'Semáforo dañado' => 'semaforo',
        'Alumbrado público' => 'alumbrado', 'Escombros en vía' => 'escombros', 'Señalización deteriorada' => 'senalizacion',
        'Árbol caído' => 'arbol', 'Hundimiento' => 'hundimiento', 'Otro' => 'otro',
    ];

    private Carbon $now;
    private array $photoCursor = [];

    public function run(): void
    {
        mt_srand(2026);
        $this->now = Carbon::now();

        // Either address style counts: a database seeded before DEMO_MAILBOX was set (or
        // migrated to aliases afterwards) must not get a second copy of the demo data.
        $marker = ['laura.gomez@' . self::DEMO_DOMAIN, $this->email('laura.gomez')];
        if (DB::table('users')->whereIn('email', $marker)->exists()) {
            DB::transaction(fn () => $this->sync());
            return;
        }

        DB::transaction(function () {
            $adminId = DB::table('users')->where('role', 'admin')->value('id');
            $types = DB::table('incident_types')->pluck('id', 'name');
            $photos = $this->photosByPrefix();

            $citizens = $this->seedCitizens();
            [$entities, $entityUsers] = $this->seedEntities($types);

            $reports = [];
            foreach ($this->reportRows() as $i => $row) {
                $reports[] = $this->insertReport($i, $row, $citizens, $types, $photos, $entities, $adminId);
            }
            $this->seedComments($reports, $citizens, $entityUsers, $adminId);
            $this->seedLikes($reports, $citizens);
        });

        $this->command?->info('Datos de demostración creados. Contraseña de todos los usuarios demo: ' . self::PASSWORD);
    }

    /** Brings an already-seeded database up to the current demo data (see class docblock). */
    private function sync(): void
    {
        $adminId = DB::table('users')->where('role', 'admin')->value('id');
        $types = DB::table('incident_types')->pluck('id', 'name');
        $photos = $this->photosByPrefix();

        $citizens = [];
        foreach (self::PEOPLE as [$first, $last]) {
            $local = $this->slug($first . '.' . explode(' ', $last)[0]);
            $citizens[] = DB::table('users')->whereIn('email', [$this->email($local), $local . '@' . self::DEMO_DOMAIN])->value('id');
        }
        $citizens = array_values(array_filter($citizens));

        $entities = [];
        $entityUsers = [];
        foreach (self::ENTITIES as $name => $def) {
            $id = DB::table('entities')->where('name', $name)->value('id');
            if (! $id) {
                continue;
            }
            $userId = DB::table('users')->where('entity_id', $id)->where('role', 'entity')->orderBy('id')->value('id');
            $operatorId = $this->ensureOperator($id, $def['operator'], $this->now->copy()->subDays(80));
            $entities[$name] = $this->entityInfo($id, $name, $def, $userId, $operatorId);
            $entityUsers = array_merge($entityUsers, array_filter([$userId, $operatorId]));
        }

        $moved = 0;
        $added = [];
        foreach ($this->reportRows() as $i => $row) {
            [$typeName, $lat, $lng, $address, $description, $status] = $row;
            $existing = DB::table('reports')->where('description', $description)->whereIn('user_id', $citizens)->first();

            if (! $existing) {
                $added[] = $this->insertReport($i, $row, $citizens, $types, $photos, $entities, $adminId);
                continue;
            }

            DB::table('report_status_history')->where('report_id', $existing->id)->delete();
            DB::table('entity_notifications')->where('report_id', $existing->id)->delete();
            DB::table('notifications')->where('report_id', $existing->id)->whereIn('type', ['estado_reporte', 'nuevo_reporte_entidad'])->delete();
            DB::table('reports')->where('id', $existing->id)->update([
                'latitude' => $lat, 'longitude' => $lng, 'address_text' => $address, 'status' => $status,
                'claimed_by_user_id' => null, 'claimed_at' => null,
                'validation_status' => null, 'validated_by_user_id' => null, 'validated_at' => null,
            ]);

            $entity = $this->entityFor($typeName, $entities);
            $updated = $this->seedStatusTrail($existing->id, $status, Carbon::parse($existing->created_at), $existing->user_id, $typeName, $entity, $adminId, $description, $address);
            DB::table('reports')->where('id', $existing->id)->update(['updated_at' => $updated]);
            $moved++;
        }

        $this->seedComments($added, $citizens, $entityUsers, $adminId);
        $this->seedLikes($added, $citizens);

        $this->command?->info("Datos de demostración sincronizados: {$moved} reportes actualizados, " . count($added) . ' nuevos.');
    }

    // ── Users ──────────────────────────────────────────────────────────────

    private function seedCitizens(): array
    {
        $password = Hash::make(self::PASSWORD);
        $ids = [];

        foreach (self::PEOPLE as $i => [$first, $last, $gender, $barrio]) {
            $created = $this->now->copy()->subDays(90 - $i * 2)->setTime(mt_rand(7, 21), mt_rand(0, 59));
            $ids[] = DB::table('users')->insertGetId([
                'first_name'      => $first,
                'last_name'       => $last,
                'email'           => $this->email($this->slug($first . '.' . explode(' ', $last)[0])),
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
        $password = Hash::make(self::PASSWORD);
        $created = $this->now->copy()->subDays(95);
        $entities = [];
        $entityUsers = [];

        foreach (self::ENTITIES as $name => $def) {
            $slug = $this->slug($name);
            $email = $this->email($slug);

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
                'email'      => $this->email($this->slug($first) . '.' . $slug),
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

            $operatorId = $this->ensureOperator($id, $def['operator'], $created->copy()->addDays(10));
            $entities[$name] = $this->entityInfo($id, $name, $def, $userId, $operatorId);
            $entityUsers[] = $userId;
            $entityUsers[] = $operatorId;
        }

        return [$entities, $entityUsers];
    }

    private function ensureOperator(int $entityId, array $name, Carbon $created): int
    {
        [$first, $last] = $name;
        $local = $this->slug($first) . '.operador';
        $id = DB::table('users')->whereIn('email', [$this->email($local), $local . '@' . self::DEMO_DOMAIN])->value('id');

        return $id ?: DB::table('users')->insertGetId([
            'first_name' => $first,
            'last_name'  => $last,
            'email'      => $this->email($local),
            'phone'      => '31' . mt_rand(10000000, 99999999),
            'password'   => Hash::make(self::PASSWORD),
            'role'       => 'operator',
            'entity_id'  => $entityId,
            'is_active'  => true,
            'notify_by_email' => true,
            'email_verified_at' => $created,
            'last_login_at' => $this->now->copy()->subHours(mt_rand(1, 48)),
            'created_at' => $created,
            'updated_at' => $created,
        ]);
    }

    private function entityInfo(int $id, string $name, array $def, ?int $userId, int $operatorId): array
    {
        $emails = DB::table('users')->whereIn('id', array_filter([$userId, $operatorId]))->pluck('email', 'id');

        return [
            'id' => $id, 'name' => $name, 'priority' => $def['priority'], 'types' => $def['types'],
            'email' => DB::table('entities')->where('id', $id)->value('entity_email'),
            'user' => $userId, 'operator' => $operatorId,
            'recipients' => array_values(array_filter([$userId ? $emails[$userId] : null, $emails[$operatorId] ?? null])),
        ];
    }

    private function entityFor(string $typeName, array $entities): ?array
    {
        return collect($entities)->first(fn ($e) => in_array($typeName, $e['types'], true));
    }

    // ── Reports ────────────────────────────────────────────────────────────

    /**
     * [type, lat, lng, address, description, status]. The first 36 are the original demo
     * reports (matched by description when syncing); points are real streets of Villavicencio.
     */
    private function reportRows(): array
    {
        return [
            ['Bache', 4.145585, -73.639381, 'Carrera 38, El Barzal, Comuna 2, Villavicencio, Meta',
                'Hueco profundo en el carril derecho, ya van varias motos que se caen de noche. Mide como un metro de ancho.', 'en_revision'],
            ['Bache', 4.15199, -73.63598, 'Calle 38, El Centro, Comuna 2, Villavicencio, Meta',
                'Bache grande frente al banco, los carros lo esquivan invadiendo el otro carril.', 'resuelto'],
            ['Bache', 4.131999, -73.635603, 'Carrera 47A, frente al Colegio Departamental La Esperanza, Comuna 7, Villavicencio, Meta',
                'La vía está llena de huecos después de las lluvias, el más grande está justo en la esquina del colegio.', 'en_revision'],
            ['Bache', 4.078724, -73.672008, 'Calle 62 Sur, Ciudad Porfía, Comuna 9, Villavicencio, Meta',
                'Hueco en plena avenida, ya le pusieron una llanta encima para avisar pero sigue creciendo.', 'notificado'],
            ['Bache', 4.135185, -73.613751, 'Calle 16, Buenos Aires, Comuna 5, Villavicencio, Meta',
                'Hay un hueco tapado con escombros que se volvió a abrir, es peligroso para los ciclistas.', 'notificado'],
            ['Bache', 4.098937, -73.654285, 'Calle 29G Sur, Montecarlo, Villavicencio, Meta',
                'Varios huecos seguidos en la cuadra, los buses del SIT pasan por aquí todo el día.', 'pendiente'],
            ['Inundación', 4.161643, -73.6384, 'Calle 47A, El Caudal, Comuna 1, Villavicencio, Meta',
                'Cada vez que llueve la calle se inunda hasta la mitad de la llanta, el sumidero está tapado.', 'pendiente'],
            ['Inundación', 4.140909, -73.637117, 'Carrera 38, Siete de Agosto, Comuna 2, Villavicencio, Meta',
                'Se represó el agua en la esquina y está entrando a las casas. Urgente revisar el alcantarillado.', 'pendiente'],
            ['Inundación', 4.122101, -73.630733, 'Calle 5B, La Vega, Comuna 7, Villavicencio, Meta',
                'La calle queda como un río con cualquier aguacero, los niños no pueden salir para el colegio.', 'en_revision'],
            ['Derrumbe', 4.177894, -73.621653, 'Vía a Restrepo, km 1, Villavicencio, Meta',
                'Se vino parte del talud sobre la vía, solo queda un carril habilitado y no hay señalización.', 'resuelto'],
            ['Derrumbe', 4.148109, -73.635287, 'Avenida Alfonso López, junto al caño Gramalote, San Isidro, Comuna 3, Villavicencio, Meta',
                'Deslizamiento de tierra al lado del caño, ya se llevó parte del andén.', 'pendiente'],
            ['Derrumbe', 4.157576, -73.638312, 'Rotonda La Grama, Comuna 1, Villavicencio, Meta',
                'Cayeron piedras grandes a la calle después del aguacero de anoche.', 'resuelto'],
            ['Semáforo dañado', 4.152222, -73.638698, 'Calle 39, frente a la Catedral Nuestra Señora del Carmen, El Centro, Comuna 2, Villavicencio, Meta',
                'El semáforo lleva tres días apagado, en hora pico es un caos y casi hay un choque.', 'notificado'],
            ['Semáforo dañado', 4.144468, -73.638474, 'Carrera 38, El Barzal, Comuna 2, Villavicencio, Meta',
                'La luz roja no prende, solo funcionan la amarilla y la verde.', 'pendiente'],
            ['Semáforo dañado', 4.123819, -73.640096, 'Avenida 40, La Esperanza, Comuna 7, Villavicencio, Meta',
                'El semáforo peatonal está caído, parece que lo chocó un camión.', 'pendiente'],
            ['Alumbrado público', 4.128544, -73.634936, 'Calle 10C, La Esperanza, Comuna 7, Villavicencio, Meta',
                'Toda la cuadra está oscura desde hace dos semanas, ya han robado a varias personas.', 'pendiente'],
            ['Alumbrado público', 4.134741, -73.615121, 'Calle 14, Buenos Aires, Comuna 5, Villavicencio, Meta',
                'La lámpara del poste parpadea toda la noche y luego se apaga.', 'notificado'],
            ['Alumbrado público', 4.079192, -73.673371, 'Calle 61 Sur, Ciudad Porfía, Comuna 9, Villavicencio, Meta',
                'El parque quedó sin luz, los postes no encienden ninguno.', 'pendiente'],
            ['Alumbrado público', 4.097769, -73.654285, 'Calle 29G Sur, Montecarlo, Villavicencio, Meta',
                'Poste con el brazo de la lámpara colgando, puede caerle a alguien.', 'en_revision'],
            ['Escombros en vía', 4.1421, -73.637923, 'Carrera 38, Siete de Agosto, Comuna 2, Villavicencio, Meta',
                'Dejaron un montón de escombros de una obra en plena vía, ocupa medio carril.', 'resuelto'],
            ['Escombros en vía', 4.163078, -73.638325, 'Calle 48, El Caudal, Comuna 1, Villavicencio, Meta',
                'Botaron escombros y basura en el separador, ya están saliendo ratas.', 'notificado'],
            ['Escombros en vía', 4.122295, -73.634614, 'Calle 5D, Villa Bolívar, Comuna 7, Villavicencio, Meta',
                'Arena y bloques sobre la calle desde hace un mes, nadie los recoge.', 'notificado'],
            ['Señalización deteriorada', 4.153663, -73.63216, 'Calle 37E, Villa Julia, Comuna 3, Villavicencio, Meta',
                'La señal de PARE está doblada y casi no se ve, los carros pasan sin detenerse.', 'en_revision'],
            ['Señalización deteriorada', 4.144272, -73.639967, 'Calle 33B, El Barzal, Comuna 2, Villavicencio, Meta',
                'El paso de cebra está totalmente borrado frente a la escuela.', 'notificado'],
            ['Señalización deteriorada', 4.156613, -73.634538, 'Calle 40, El Emporio, Comuna 1, Villavicencio, Meta',
                'Rayaron y torcieron la señal de velocidad máxima de la curva.', 'resuelto'],
            ['Árbol caído', 4.156153, -73.638513, 'Calle 41B, La Grama, Comuna 1, Villavicencio, Meta',
                'Se cayó un árbol grande con la tormenta y está bloqueando toda la calle.', 'resuelto'],
            ['Árbol caído', 4.143807, -73.629239, 'Transversal 26, Gaitán, Comuna 3, Villavicencio, Meta',
                'Árbol caído encima de los cables de energía, hay riesgo eléctrico.', 'notificado'],
            ['Árbol caído', 4.151012, -73.638238, 'Calle 38, Parque Los Libertadores, El Centro, Comuna 2, Villavicencio, Meta',
                'Una rama enorme cayó sobre el andén del parque, no se puede pasar.', 'en_revision'],
            ['Hundimiento', 4.079981, -73.67131, 'Calle 59 Sur, Ciudad Porfía, Comuna 9, Villavicencio, Meta',
                'La calzada se está hundiendo, ya se formó un hueco que deja ver la tubería.', 'pendiente'],
            ['Hundimiento', 4.129857, -73.635522, 'Calle 11B, La Esperanza, Comuna 7, Villavicencio, Meta',
                'Se hundió el pavimento cerca de la alcantarilla, cada día está más grande.', 'en_revision'],
            ['Hundimiento', 4.136586, -73.613427, 'Carrera 12B, Buenos Aires, Comuna 5, Villavicencio, Meta',
                'Hundimiento en la vía al lado del caño, los vecinos pusieron una cinta para que nadie caiga.', 'resuelto'],
            ['Otro', 4.107869, -73.653164, 'Carrera 46, Catumare, Villavicencio, Meta',
                'Carro abandonado hace meses ocupando la vía, ya está lleno de basura.', 'notificado'],
            ['Otro', 4.141832, -73.636013, 'Calle 27, Siete de Agosto, Comuna 2, Villavicencio, Meta',
                'Muro rayado y lleno de basura en la esquina, se volvió un punto crítico.', 'resuelto'],
            ['Bache', 4.132357, -73.628392, 'Calle 15A, Nuevo Ricaurte, Comuna 6, Villavicencio, Meta',
                'Hueco grande en la entrada del barrio, los taxis ya no quieren entrar.', 'pendiente'],
            ['Inundación', 4.07792, -73.670814, 'Calle 65 Sur, Ciudad Porfía, Comuna 9, Villavicencio, Meta',
                'Se inunda la calle y el agua se mete al conjunto, el caño está lleno de basura.', 'resuelto'],
            ['Alumbrado público', 4.13955, -73.636648, 'Carrera 38, Siete de Agosto, Comuna 2, Villavicencio, Meta',
                'Tres postes seguidos apagados en la calle principal del barrio.', 'notificado'],
            ['Bache', 4.120065, -73.613059, 'Avenida Puerto López, a la altura del Anillo Vial, Quintas de Aguas Claras, Comuna 5, Villavicencio, Meta',
                'Seguidilla de huecos en la Avenida Puerto López a la altura del Anillo Vial. Las tractomulas que salen hacia Puerto López los están agrandando y de noche no se ven.', 'en_proceso'],
            ['Bache', 4.122974, -73.612572, 'Anillo Vial, Quintas de Aguas Claras, Comuna 5, Villavicencio, Meta',
                'En el Anillo Vial, sentido hacia Catama, hay un hueco en el carril rápido que obliga a frenar en seco. Ya hubo un choque por alcance esta semana.', 'notificado'],
            ['Bache', 4.122346, -73.647564, 'Calle 4 Sur, Llano Lindo, Villavicencio, Meta',
                'La calle principal de Llano Lindo está destapada en un tramo y con el invierno se formaron charcos enormes; el colectivo ya no quiere entrar.', 'pendiente'],
            ['Bache', 4.106701, -73.653164, 'Calle 20A Sur, Catumare, Villavicencio, Meta',
                'Hueco profundo en la entrada de Catumare, justo donde paran los buses. Los pasajeros se tienen que bajar en el barro.', 'en_camino'],
            ['Bache', 4.156432, -73.65267, 'Carrera 49, Doce de Octubre, Comuna 1, Villavicencio, Meta',
                'Bache grande en la Carrera 49 del Doce de Octubre, las motos lo esquivan subiéndose al andén.', 'resuelto'],
            ['Hundimiento', 4.154395, -73.635388, 'Avenida Alfonso López, Emporio Bajo, Comuna 1, Villavicencio, Meta',
                'Se está hundiendo el pavimento en la Avenida Alfonso López, a la altura del Emporio Bajo. Ya se nota el escalón y los carros golpean al pasar.', 'en_revision'],
            ['Hundimiento', 4.11721, -73.651713, 'Calle 14 Sur, Serramonte, Villavicencio, Meta',
                'Hundimiento junto a la tapa de la alcantarilla en Serramonte; cada aguacero lo hace más profundo.', 'notificado'],
            ['Derrumbe', 4.151663, -73.63416, 'Calle 37A, orilla del caño Gramalote, San Isidro, Comuna 3, Villavicencio, Meta',
                'La orilla del caño Gramalote se está desmoronando al lado de la Calle 37A y ya se llevó parte del andén. Hay casas muy cerca.', 'notificado'],
            ['Derrumbe', 4.161202, -73.662782, 'Vía Bogotá, Nueva Granada, Comuna 1, Villavicencio, Meta',
                'Material del talud cayó sobre la Vía Bogotá a la salida de Nueva Granada; hay piedras sueltas en el carril de subida.', 'pendiente'],
            ['Inundación', 4.15671, -73.657627, 'Carrera 55, Galán, Comuna 1, Villavicencio, Meta',
                'Cada vez que llueve fuerte la Carrera 55 en Galán queda como un río; el sumidero de la esquina está tapado con basura.', 'resuelto'],
            ['Inundación', 4.134418, -73.640354, 'Avenida Calle 15, frente al C.C. Primavera Urbana, Villa María, Comuna 2, Villavicencio, Meta',
                'La Avenida Calle 15 frente a Primavera Urbana se inunda con cualquier aguacero y el agua alcanza los andenes; los peatones no pueden cruzar.', 'en_proceso'],
            ['Inundación', 4.12999, -73.587779, 'Calle 25, Marco Antonio Pinilla, Comuna 5, Villavicencio, Meta',
                'En Marco Antonio Pinilla el agua de lluvia se represa en la Calle 25 y se mete a las casas de la cuadra.', 'pendiente'],
            ['Inundación', 4.143697, -73.644363, 'Carrera 44A, frente al Hospital Departamental, El Buque, Comuna 2, Villavicencio, Meta',
                'Frente a urgencias del Hospital Departamental se forma un charco enorme cuando llueve; las ambulancias pasan con dificultad.', 'notificado'],
            ['Semáforo dañado', 4.14185, -73.633984, 'Calle 26B, entrada del C.C. Unicentro, Nuevo Maizaro, Comuna 6, Villavicencio, Meta',
                'El semáforo de la entrada a Unicentro está intermitente desde el fin de semana; los carros que salen del centro comercial no saben cuándo pasar.', 'en_revision'],
            ['Semáforo dañado', 4.125659, -73.637444, 'Calle 7, frente al C.C. Viva Villavicencio, La Esperanza, Comuna 7, Villavicencio, Meta',
                'El semáforo frente a Viva Villavicencio se queda en rojo para los dos sentidos al mismo tiempo y se forman filas larguísimas.', 'notificado'],
            ['Semáforo dañado', 4.148841, -73.631823, 'Avenida Catama, San Gregorio, Comuna 3, Villavicencio, Meta',
                'El semáforo peatonal de la Avenida Catama no da tiempo suficiente para cruzar; los adultos mayores quedan en la mitad de la vía.', 'pendiente'],
            ['Señalización deteriorada', 4.139913, -73.620872, 'Avenida 19, junto al Estadio Bello Horizonte, Dos Mil, Comuna 5, Villavicencio, Meta',
                'Las señales de velocidad y el paso peatonal junto al Estadio Bello Horizonte están borrados; los días de partido es peligroso.', 'resuelto'],
            ['Señalización deteriorada', 4.151223, -73.633113, 'Calle 37A, San Isidro, Comuna 3, Villavicencio, Meta',
                'No hay señal de PARE en la esquina de la Calle 37A en San Isidro y ya van dos choques este mes.', 'pendiente'],
            ['Señalización deteriorada', 4.152389, -73.626796, 'Carrera 21A, Industrial, Comuna 3, Villavicencio, Meta',
                'Los pasos de cebra del barrio Industrial ya no se ven; los camiones de los talleres pasan rápido.', 'notificado'],
            ['Alumbrado público', 4.12287, -73.574446, 'Calle 20 Sur, vía al Parque Las Malocas, Comuna 5, Villavicencio, Meta',
                'La vía hacia el Parque Las Malocas está totalmente oscura en la noche; los que salen de los eventos caminan sin luz.', 'en_camino'],
            ['Alumbrado público', 4.116388, -73.618027, 'Calle 4A Sur, Remansos de Rosablanca, Comuna 7, Villavicencio, Meta',
                'Cuatro postes apagados en la Calle 4A Sur de Remansos de Rosablanca, la cuadra queda a oscuras desde las 6 p. m.', 'notificado'],
            ['Alumbrado público', 4.124006, -73.621906, 'Calle 4E, La Alborada, Comuna 7, Villavicencio, Meta',
                'La lámpara del parque de La Alborada se apagó y los muchachos se reúnen ahí en lo oscuro.', 'resuelto'],
            ['Alumbrado público', 4.068304, -73.667109, 'Calle 85 Sur, Villa Juliana, Comuna 9, Villavicencio, Meta',
                'En Villa Juliana la mitad de las luminarias de la Calle 85 Sur no prenden; las mamás tienen miedo de salir con los niños.', 'pendiente'],
            ['Escombros en vía', 4.131873, -73.591084, 'Calle 27, Los Maracos, Comuna 5, Villavicencio, Meta',
                'Alguien botó escombros y colchones en la esquina de la Calle 27 en Los Maracos; ya ocupan medio carril.', 'notificado'],
            ['Escombros en vía', 4.138994, -73.586797, 'Carrera 17A Este, Antonio Villavicencio, Comuna 4, Villavicencio, Meta',
                'Montaña de arena y ladrillo de una obra sobre la Carrera 17A Este en Antonio Villavicencio, lleva más de tres semanas.', 'pendiente'],
            ['Escombros en vía', 4.118213, -73.652102, 'Diagonal 14 Sur, Serramonte, Villavicencio, Meta',
                'Restos de poda y escombros abandonados en la Diagonal 14 Sur de Serramonte, ya están tapando la cuneta.', 'en_revision'],
            ['Árbol caído', 4.154527, -73.639324, 'Calle 41A, Parque Infantil, Comuna 2, Villavicencio, Meta',
                'Un árbol grande del Parque Infantil quedó inclinado sobre la Calle 41A después del vendaval; las ramas tocan los cables.', 'resuelto'],
            ['Árbol caído', 4.15824, -73.642574, 'Carrera 35, El Triunfo, Comuna 1, Villavicencio, Meta',
                'Se cayó un mango viejo sobre la Carrera 35 en El Triunfo y bloquea un carril; los vecinos pusieron conos.', 'notificado'],
            ['Otro', 4.120892, -73.641833, 'Anillo Vial, junto al Parque Los Fundadores, Comuna 7, Villavicencio, Meta',
                'Basura acumulada junto al Parque Los Fundadores, sobre el Anillo Vial; los fines de semana se llena de bolsas y huele muy mal.', 'pendiente'],
            ['Otro', 4.135395, -73.619416, 'Carrera 18A, Bello Horizonte, Comuna 5, Villavicencio, Meta',
                'Punto crítico de basuras en la Carrera 18A de Bello Horizonte: la gente saca la basura fuera de horario y los perros la riegan.', 'notificado'],
        ];
    }

    private function insertReport(int $i, array $row, array $citizens, $types, array $photos, array $entities, ?int $adminId): array
    {
        [$typeName, $lat, $lng, $address, $description, $status] = $row;
        $ownerId = $citizens[$i % count($citizens)];
        // Resolved/notified reports are older; the ones still moving are recent.
        $ageDays = match ($status) {
            'resuelto' => mt_rand(20, 60), 'notificado' => mt_rand(5, 30), 'en_proceso' => mt_rand(3, 10),
            'en_revision' => mt_rand(2, 8), 'en_camino' => mt_rand(1, 4), default => mt_rand(0, 4),
        };
        $created = $this->now->copy()->subDays($ageDays)->setTime(mt_rand(6, 21), mt_rand(0, 59));
        if ($created->greaterThan($this->now)) {
            $created = $this->now->copy()->subHours(mt_rand(2, 10));
        }
        $entity = $this->entityFor($typeName, $entities);

        $reportId = DB::table('reports')->insertGetId([
            'user_id'          => $ownerId,
            'incident_type_id' => $types[$typeName],
            'description'      => $description,
            'status'           => $status,
            'latitude'         => $lat,
            'longitude'        => $lng,
            'address_text'     => $address,
            'is_edited'        => false,
            'created_at'       => $created,
            'updated_at'       => $created,
        ]);

        // Photos: 1–2 from this incident type's pool, rotating so neighbours differ.
        $pool = $photos[self::PHOTO_PREFIXES[$typeName]] ?? [];
        $count = min(count($pool), mt_rand(1, 2));
        for ($p = 0; $p < $count; $p++) {
            $cursor = $this->photoCursor[$typeName] = ($this->photoCursor[$typeName] ?? -1) + 1;
            DB::table('report_images')->insert([
                'report_id' => $reportId, 'path' => $pool[$cursor % count($pool)],
                'type' => 'image', 'kind' => 'reporte',
                'created_at' => $created, 'updated_at' => $created,
            ]);
        }

        $updated = $this->seedStatusTrail($reportId, $status, $created, $ownerId, $typeName, $entity, $adminId, $description, $address);
        DB::table('reports')->where('id', $reportId)->update(['updated_at' => $updated]);

        return ['id' => $reportId, 'owner' => $ownerId, 'created' => $created, 'status' => $status, 'entity' => $entity];
    }

    /**
     * Writes the history the real app would have produced up to $status — the queue job
     * notifying the entity, then its operator claiming, arriving, working and closing —
     * with the owner's and the entity's notifications. Returns the last step's time.
     */
    private function seedStatusTrail(int $reportId, string $status, Carbon $created, int $ownerId, string $typeName, ?array $entity, ?int $adminId, string $description, string $address): Carbon
    {
        $steps = array_slice(self::FLOW, 1, array_search($status, self::FLOW, true));
        $operatorId = $entity['operator'] ?? null;
        $previous = 'pendiente';
        $at = $created->copy();

        foreach ($steps as $step) {
            $at = $at->copy()->addMinutes(match ($step) {
                'notificado' => mt_rand(1, 4), 'en_camino' => mt_rand(120, 2880), 'en_revision' => mt_rand(20, 120),
                'en_proceso' => mt_rand(5, 60), 'resuelto' => mt_rand(120, 4320),
            });
            if ($at->greaterThan($this->now)) {
                $at = $this->now->copy()->subMinutes(mt_rand(5, 90));
            }
            $actorId = $step === 'notificado' ? null : $operatorId;

            DB::table('report_status_history')->insert([
                'report_id' => $reportId, 'previous_status' => $previous, 'new_status' => $step,
                'changed_by_user_id' => $actorId,
                'notes' => $step === 'notificado' ? 'Notificado por correo a: ' . ($entity['name'] ?? 'entidad responsable') : null,
                'created_at' => $at, 'updated_at' => $at,
            ]);

            $this->notify($ownerId, $actorId, 'estado_reporte', 'Estado de reporte actualizado',
                "Tu reporte de {$typeName} cambió a " . self::STATUS_LABELS[$step], $reportId, null, $at);

            if ($step === 'notificado' && $entity) {
                foreach (array_filter([$entity['email'], ...$entity['recipients']]) as $email) {
                    DB::table('entity_notifications')->insert([
                        'report_id' => $reportId,
                        'entity_email' => $email,
                        'subject' => "Nuevo reporte ciudadano: {$typeName}",
                        'message' => "Se ha registrado un nuevo reporte de {$typeName} en {$address}.\n\nDescripción: {$description}",
                        'priority' => $entity['priority'],
                        'status' => $status === 'resuelto' ? 'actualizada' : (mt_rand(0, 1) ? 'vista' : 'enviada'),
                        'created_at' => $at, 'updated_at' => $at,
                    ]);
                }
                foreach (array_filter([$entity['user'], $operatorId]) as $userId) {
                    $this->notify($userId, null, 'nuevo_reporte_entidad', 'Nuevo reporte asignado',
                        "Se asignó un nuevo reporte de {$typeName} a {$entity['name']}.", $reportId, null, $at);
                }
            }

            if ($step === 'en_camino') {
                DB::table('reports')->where('id', $reportId)->update(['claimed_by_user_id' => $operatorId, 'claimed_at' => $at]);
            }

            $previous = $step;
        }

        // Reports that reached the field were reviewed by the admin early on; newer ones are
        // left unreviewed so the admin's queue has something in it during a demo.
        if ($adminId && array_search($status, self::FLOW, true) >= array_search('en_camino', self::FLOW, true)) {
            $validatedAt = $created->copy()->addMinutes(mt_rand(30, 240));
            DB::table('reports')->where('id', $reportId)->update([
                'validation_status' => 'valido', 'validated_by_user_id' => $adminId,
                'validated_at' => $validatedAt->greaterThan($this->now) ? $this->now : $validatedAt,
            ]);
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

                // An official reply on reports the entity already handles; the operator speaks
                // up on the ones being worked in the field.
                if ($c === $n - 1 && $r['entity'] && in_array($r['status'], ['notificado', 'resuelto'], true)) {
                    $authorId = $r['entity']['user'];
                    $body = $r['status'] === 'resuelto'
                        ? 'Buen día. Les informamos que la cuadrilla ya atendió este caso. Gracias por reportar.'
                        : 'Recibimos el reporte, quedó programada una visita técnica esta semana.';
                } elseif ($c === $n - 1 && ($r['entity']['operator'] ?? null) && in_array($r['status'], ['en_camino', 'en_revision', 'en_proceso'], true)) {
                    $authorId = $r['entity']['operator'];
                    $body = $r['status'] === 'en_camino'
                        ? 'Buenas, vamos en camino para revisar el punto.'
                        : 'Ya estamos en el sitio trabajando en el arreglo. Gracias por la paciencia.';
                } elseif ($c === 0 && $r['status'] === 'pendiente' && $adminId) {
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

    private function email(string $local): string
    {
        $mailbox = env('DEMO_MAILBOX');

        if (! $mailbox || ! str_contains($mailbox, '@')) {
            return $local . '@' . self::DEMO_DOMAIN;
        }

        [$user, $domain] = explode('@', $mailbox, 2);

        return "{$user}+{$local}@{$domain}";
    }

    private function slug(string $text): string
    {
        return \Illuminate\Support\Str::slug($text, '.');
    }
}

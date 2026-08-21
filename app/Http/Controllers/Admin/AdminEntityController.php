<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\EntityInviteMail;
use App\Models\Entity;
use App\Models\IncidentType;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminEntityController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Entities/Index', [
            'entities' => Entity::with([
                'incidentTypes:id,name',
                'users:id,entity_id,first_name,last_name,email,is_active',
            ])->orderBy('name')->get(),
            'incident_types' => IncidentType::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'                 => ['required', 'string', 'max:150', 'unique:entities,name'],
            'description'          => ['nullable', 'string'],
            // New entities are created active by default (no is_active field in this form yet),
            // so an entity_email is required here — same rule as "activa" means for update().
            'entity_email'         => ['required', 'email', 'max:150'],
            'subject_template'     => ['nullable', 'string', 'max:300'],
            'message_template'     => ['nullable', 'string'],
            'priority'             => ['required', 'in:alta,media,baja'],
            'incident_type_ids'    => ['array'],
            'incident_type_ids.*'  => ['integer', 'exists:incident_types,id'],
        ]);

        $entity = Entity::create(collect($data)->except('incident_type_ids')->all());
        $entity->incidentTypes()->sync($data['incident_type_ids'] ?? []);

        return back()->with('success', 'Entidad creada.');
    }

    public function update(Request $request, Entity $entity): RedirectResponse
    {
        $data = $request->validate([
            'name'                 => ['required', 'string', 'max:150', 'unique:entities,name,' . $entity->id],
            'description'          => ['nullable', 'string'],
            // Required only while the entity is active — the 7 seeded entities stay inactive
            // with no confirmed contact email yet, and must remain editable without one.
            'entity_email'         => [$entity->is_active ? 'required' : 'nullable', 'email', 'max:150'],
            'subject_template'     => ['nullable', 'string', 'max:300'],
            'message_template'     => ['nullable', 'string'],
            'priority'             => ['required', 'in:alta,media,baja'],
            'incident_type_ids'    => ['array'],
            'incident_type_ids.*'  => ['integer', 'exists:incident_types,id'],
        ]);

        $entity->update(collect($data)->except('incident_type_ids')->all());
        $entity->incidentTypes()->sync($data['incident_type_ids'] ?? []);

        return back()->with('success', 'Entidad actualizada.');
    }

    public function destroy(Entity $entity): RedirectResponse
    {
        $entity->delete();

        return back()->with('success', 'Entidad eliminada.');
    }

    public function toggle(Entity $entity): RedirectResponse
    {
        $entity->update(['is_active' => !$entity->is_active]);

        return back()->with('success', 'Entidad ' . ($entity->is_active ? 'activada' : 'desactivada') . '.');
    }

    public function storeUser(Request $request, Entity $entity): RedirectResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'phone'      => ['required', 'string', 'max:20', 'unique:users,phone'],
        ]);

        $user = User::create([
            ...$data,
            'entity_id' => $entity->id,
            'role'      => 'entity',
            // Unusable random password: the account is only activated once the user sets
            // their own password through the invite link below (same flow as PasswordResetController).
            'password'  => Hash::make(Str::random(32)),
            'is_active' => true,
        ]);

        $token = Str::random(64);

        DB::table('password_reset_tokens')->upsert(
            ['email' => $user->email, 'token' => Hash::make($token), 'created_at' => now()],
            ['email'],
            ['token', 'created_at'],
        );

        Mail::to($user->email)->queue(new EntityInviteMail($token, $user->name, $entity->name));

        return back()->with('success', 'Usuario creado. Se envió una invitación por correo para que establezca su contraseña.');
    }

    public function toggleUser(User $user): RedirectResponse
    {
        abort_unless($user->entity_id !== null, 404);

        $user->update(['is_active' => !$user->is_active]);

        return back()->with('success', 'Usuario ' . ($user->is_active ? 'activado' : 'desactivado') . '.');
    }
}

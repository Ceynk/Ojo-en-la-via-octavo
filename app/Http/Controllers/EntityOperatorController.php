<?php

namespace App\Http\Controllers;

use App\Mail\EntityInviteMail;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class EntityOperatorController extends Controller
{
    public function index(Request $request): Response
    {
        $entity = $request->user()->entity;

        return Inertia::render('Entity/Operators', [
            'operators' => $entity->users()
                ->where('role', 'operator')
                ->select('id', 'entity_id', 'first_name', 'last_name', 'email', 'phone', 'is_active', 'location_updated_at')
                ->orderBy('first_name')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $entity = $request->user()->entity;

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'phone'      => ['required', 'string', 'max:20', 'unique:users,phone'],
        ]);

        $user = User::create([
            ...$data,
            'entity_id' => $entity->id,
            'role'      => 'operator',
            // Mismo patrón que AdminEntityController::storeUser: contraseña inutilizable,
            // la cuenta se activa cuando el operador defina la suya vía el link de invitación.
            'password'  => Hash::make(Str::random(32)),
            'is_active' => true,
        ]);

        $token = Str::random(64);

        DB::table('password_reset_tokens')->upsert(
            ['email' => $user->email, 'token' => Hash::make($token), 'created_at' => now()],
            ['email'],
            ['token', 'created_at'],
        );

        Mail::to($user->email)->queue(new EntityInviteMail($token, $user->name, $entity->name, panelLabel: 'operador'));

        return back()->with('success', 'Operador creado. Se envió una invitación por correo para que establezca su contraseña.');
    }

    public function toggle(Request $request, User $user): RedirectResponse
    {
        abort_unless(
            $user->role === 'operator' && $user->entity_id === $request->user()->entity_id,
            404,
        );

        $user->update(['is_active' => !$user->is_active]);

        return back()->with('success', 'Operador ' . ($user->is_active ? 'activado' : 'desactivado') . '.');
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::when($request->filled('search'), fn ($q) => $q->where(function ($q) use ($request) {
            $q->where('first_name', 'like', "%{$request->search}%")
                ->orWhere('last_name', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%");
        }))
            ->withCount('reports')
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users'   => $users,
            'filters' => $request->only(['search']),
        ]);
    }

    public function toggle(Request $request, User $user): RedirectResponse
    {
        if ($user->isAdmin()) {
            return back()->withErrors(['user' => 'No puedes editar cuentas de administrador.']);
        }

        $user->update(['is_active' => !$user->is_active]);

        return back()->with('success', 'Estado del usuario actualizado.');
    }

    public function changeRole(Request $request, User $user): RedirectResponse
    {
        if ($user->isAdmin()) {
            return back()->withErrors(['role' => 'No puedes editar cuentas de administrador.']);
        }

        $data = $request->validate([
            'role' => ['required', 'in:ciudadano,admin'],
        ]);

        $user->update($data);

        return back()->with('success', 'Rol actualizado correctamente.');
    }
}

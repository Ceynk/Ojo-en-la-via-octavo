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
        $users = User::where('role', 'ciudadano')
            ->when($request->filled('search'), fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
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
        $user->update(['is_active' => !$user->is_active]);

        return back()->with('success', 'Estado del usuario actualizado.');
    }

    public function changeRole(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->withErrors(['role' => 'No puedes cambiar tu propio rol.']);
        }

        $data = $request->validate([
            'role' => ['required', 'in:ciudadano,admin'],
        ]);

        $user->update($data);

        return back()->with('success', 'Rol actualizado correctamente.');
    }
}

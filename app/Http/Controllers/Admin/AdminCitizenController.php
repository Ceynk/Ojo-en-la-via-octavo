<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminCitizenController extends Controller
{
    public function index(Request $request): Response
    {
        $citizens = User::where('role', 'ciudadano')
            ->when($request->filled('search'), fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('first_name', 'like', "%{$request->search}%")
                    ->orWhere('last_name', 'like', "%{$request->search}%")
                    ->orWhere('document_number', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            }))
            ->withCount(['reports', 'comments', 'likes'])
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Citizens/Index', [
            'citizens' => $citizens,
            'filters'  => $request->only(['search']),
        ]);
    }

    public function show(User $user): Response
    {
        abort_unless($user->role === 'ciudadano', 404);

        $user->loadCount([
            'reports',
            'reports as resolved_reports_count' => fn ($q) => $q->where('status', 'resuelto'),
            'comments',
            'likes',
        ]);

        $reports = $user->reports()
            ->with('incidentType:id,name')
            ->withCount(['likes', 'comments'])
            ->latest()
            ->limit(20)
            ->get();

        $comments = $user->comments()
            ->with('report:id,description,incident_type_id')
            ->where('is_deleted', false)
            ->latest()
            ->limit(20)
            ->get();

        return Inertia::render('Admin/Citizens/Show', [
            'citizen'  => $user,
            'reports'  => $reports,
            'comments' => $comments,
        ]);
    }
}

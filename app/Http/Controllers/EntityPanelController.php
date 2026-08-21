<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ScopesToEntity;
use App\Models\Report;
use App\Models\ReportStatusHistory;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class EntityPanelController extends Controller
{
    use ScopesToEntity;

    public function __construct(private NotificationService $notifications) {}

    public function dashboard(Request $request): Response
    {
        $typeIds = $this->entityIncidentTypeIds($request);

        $query = Report::whereIn('incident_type_id', $typeIds)
            ->with(['user:id,first_name,last_name', 'incidentType:id,name', 'images'])
            ->withCount(['likes', 'comments']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $reports = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('Entity/Dashboard', [
            'reports' => $reports,
            'filters' => $request->only('status'),
            'entity'  => $request->user()->entity->only(['id', 'name']),
        ]);
    }

    public function show(Request $request, Report $report): Response
    {
        $this->authorizeForEntity($request, $report);

        $report->load([
            'user:id,first_name,last_name',
            'incidentType:id,name',
            'images',
            'statusHistory.changedBy:id,first_name,last_name',
            'claimedBy:id,first_name,last_name',
        ]);
        $report->loadCount(['likes', 'comments']);

        return Inertia::render('Entity/Show', ['report' => $report]);
    }

    public function profile(Request $request): Response
    {
        return Inertia::render('Entity/Profile', $this->buildProfileData($request));
    }

    /**
     * Operators share the same account fields/stats as entity admins, but need their
     * own page — Entity/Profile.tsx renders <EntityLayout> and posts to /entidad/*,
     * which 403s for an operator (wrong middleware entirely).
     */
    public function operatorProfile(Request $request): Response
    {
        return Inertia::render('Operator/Profile', $this->buildProfileData($request));
    }

    private function buildProfileData(Request $request): array
    {
        $user = $request->user();
        $typeIds = $this->entityIncidentTypeIds($request);

        $reportsQuery = fn () => Report::whereIn('incident_type_id', $typeIds);

        $resolvedHistories = ReportStatusHistory::where('new_status', 'resuelto')
            ->whereHas('report', fn ($q) => $q->whereIn('incident_type_id', $typeIds))
            ->with('report:id,created_at')
            ->get();

        $stats = [
            'total'               => $reportsQuery()->count(),
            'resueltos'           => $reportsQuery()->where('status', 'resuelto')->count(),
            'pendientes'          => $reportsQuery()->whereIn('status', ['pendiente', 'en_revision', 'notificado'])->count(),
            'avg_resolution_days' => $resolvedHistories->isEmpty() ? null : round(
                $resolvedHistories->avg(fn ($h) => $h->report->created_at->diffInHours($h->created_at) / 24),
                1,
            ),
        ];

        $recentActivity = ReportStatusHistory::where('changed_by_user_id', $user->id)
            ->with('report:id,description,incident_type_id')
            ->latest()
            ->limit(8)
            ->get();

        $teammates = $user->entity->users()
            ->where('is_active', true)
            ->where('id', '!=', $user->id)
            ->get(['id', 'first_name', 'last_name', 'email', 'profile_photo']);

        return [
            'user'            => $user,
            'stats'           => $stats,
            'recent_activity' => $recentActivity,
            'teammates'       => $teammates,
        ];
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'first_name'    => ['required', 'string', 'max:100'],
            'last_name'     => ['required', 'string', 'max:100'],
            'email'         => ['required', 'email', 'unique:users,email,' . $user->id],
            'phone'         => ['nullable', 'string', 'max:20', 'unique:users,phone,' . $user->id],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        if ($request->hasFile('profile_photo')) {
            if ($user->profile_photo) {
                Storage::disk('public')->delete($user->profile_photo);
            }
            $data['profile_photo'] = $request->file('profile_photo')->store('avatars', 'public');
        }

        $user->update($data);

        return back()->with('success', 'Perfil actualizado correctamente.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password'         => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $request->user()->update(['password' => Hash::make($data['password'])]);

        return back()->with('success', 'Contraseña actualizada correctamente.');
    }

    public function updatePreferences(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'notify_by_email' => ['required', 'boolean'],
        ]);

        $request->user()->update($data);

        return back()->with('success', 'Preferencias actualizadas.');
    }

    public function infoEdit(Request $request): Response
    {
        return Inertia::render('Entity/Info', ['entity' => $request->user()->entity]);
    }

    public function updateInfo(Request $request): RedirectResponse
    {
        $entity = $request->user()->entity;

        $data = $request->validate([
            'description'  => ['nullable', 'string', 'max:1000'],
            'motto'        => ['nullable', 'string', 'max:150'],
            'website_url'  => ['nullable', 'url', 'max:255'],
            'logo'         => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        if ($request->hasFile('logo')) {
            if ($entity->logo_path) {
                Storage::disk('public')->delete($entity->logo_path);
            }
            $data['logo_path'] = $request->file('logo')->store('entity-logos', 'public');
        }
        unset($data['logo']);

        $entity->update($data);

        return back()->with('success', 'Información de la entidad actualizada.');
    }
}

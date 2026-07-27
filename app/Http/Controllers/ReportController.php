<?php

namespace App\Http\Controllers;

use App\Events\ReportCreated;
use App\Models\Report;
use App\Models\ReportImage;
use App\Services\NotificationService;
use App\Services\EntityNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        private NotificationService $notifications,
        private EntityNotificationService $entityNotifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Report::with(['user:id,name', 'incidentType:id,name', 'images'])
            ->withCount(['likes', 'comments'])
            ->withExists([
                'likes as user_liked' => fn ($q) => $q->where('user_id', auth()->id()),
            ])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('incident_type_id'), fn ($q) => $q->where('incident_type_id', $request->incident_type_id))
            ->when($request->filled('search'), fn ($q) => $q->where('description', 'like', "%{$request->search}%"))
            ->latest();

        if ($request->boolean('paginate')) {
            return response()->json($query->paginate(12));
        }

        return response()->json($query->get());
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'incident_type_id' => ['required', 'exists:incident_types,id'],
            'description'      => ['required', 'string', 'max:800'],
            'latitude'         => ['required', 'numeric', 'between:-90,90'],
            'longitude'        => ['required', 'numeric', 'between:-180,180'],
            'address_text'     => ['required', 'string', 'max:300'],
            'image'            => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $report = $request->user()->reports()->create($data);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('reportes', 'public');
            $report->images()->create(['path' => $path]);
        }

        $this->entityNotifications->dispatch($report);

        broadcast(new ReportCreated($report->load(['incidentType:id,name', 'user:id,name'])));

        return redirect()->route('citizen.home')->with('success', 'Reporte creado exitosamente.');
    }

    public function show(Report $report): JsonResponse
    {
        $report->load([
            'user:id,name,profile_photo',
            'incidentType:id,name',
            'images',
            'statusHistory.changedBy:id,name',
        ]);

        $report->loadCount(['likes', 'comments']);
        $report->user_liked = $report->likes()->where('user_id', auth()->id())->exists();

        return response()->json($report);
    }

    public function update(Request $request, Report $report): RedirectResponse
    {
        Gate::authorize('update', $report);

        $data = $request->validate([
            'incident_type_id' => ['required', 'exists:incident_types,id'],
            'description'      => ['required', 'string', 'max:800'],
            'latitude'         => ['required', 'numeric', 'between:-90,90'],
            'longitude'        => ['required', 'numeric', 'between:-180,180'],
            'address_text'     => ['required', 'string', 'max:300'],
            'image'            => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $report->update(array_merge($data, ['is_edited' => true, 'edited_at' => now()]));

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('reportes', 'public');
            $report->images()->create(['path' => $path]);
        }

        return back()->with('success', 'Reporte actualizado.');
    }

    public function destroy(Report $report): RedirectResponse
    {
        Gate::authorize('delete', $report);

        foreach ($report->images as $image) {
            Storage::disk('public')->delete($image->path);
        }

        $report->delete();

        return redirect()->route('citizen.reports')->with('success', 'Reporte eliminado.');
    }
}

<?php

namespace App\Http\Controllers;

use App\Events\ReportCreated;
use App\Jobs\GenerateReportEmbedding;
use App\Jobs\NotifyEntitiesOfReport;
use App\Models\Report;
use App\Models\ReportImage;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        private NotificationService $notifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Report::with(['user:id,first_name,last_name', 'incidentType:id,name', 'images'])
            ->withCount(['likes', 'comments'])
            ->withExists([
                'likes as user_liked' => fn ($q) => $q->where('user_id', auth()->id()),
            ])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('incident_type_id'), fn ($q) => $q->where('incident_type_id', $request->incident_type_id))
            ->when($request->filled('search'), fn ($q) => $q->where('description', 'like', "%{$request->search}%"))
            ->when($request->boolean('mine'), fn ($q) => $q->where('user_id', auth()->id()))
            ->when(
                $request->input('sort') === 'comments',
                fn ($q) => $q->orderByDesc('comments_count')->latest(),
                fn ($q) => $q->latest(),
            );

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
            'media'            => ['nullable', 'array'],
            'media.*'          => ['file', 'mimetypes:image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm', 'max:51200'],
            // Only populated when the citizen saw a possible-duplicate alert and chose to
            // continue anyway (see ReportDuplicateController::check) — never trusted blindly
            // as "the same report", just recorded for admins to review.
            'possible_duplicate_of' => ['nullable', 'integer', 'exists:reports,id'],
            'duplicate_similarity'  => ['nullable', 'numeric', 'between:0,1'],
        ]);

        $report = $request->user()->reports()->create(collect($data)->except('media')->all());

        $this->storeMediaFiles($report, $request);

        // Entity notification is fire-and-forget: it's a queued job (see NotifyEntitiesOfReport),
        // so dispatch() only inserts a queue row and returns — it doesn't send any mail here.
        // The try/catch is just extra insurance so even a failure to enqueue (e.g. the queue
        // connection being unreachable) can never fail report creation for the citizen.
        try {
            NotifyEntitiesOfReport::dispatch($report);
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch NotifyEntitiesOfReport', ['report_id' => $report->id, 'error' => $e->getMessage()]);
        }

        // Also fire-and-forget: precomputes the embedding used for future duplicate checks.
        // A failure to enqueue must never fail report creation for the citizen.
        try {
            GenerateReportEmbedding::dispatch($report);
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch GenerateReportEmbedding', ['report_id' => $report->id, 'error' => $e->getMessage()]);
        }

        // Real-time push is best-effort — the report is already saved, so a broadcast
        // outage (e.g. the websocket server being down) must not fail the whole request.
        try {
            broadcast(new ReportCreated($report->load(['incidentType:id,name', 'user:id,first_name,last_name'])));
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed for ReportCreated', ['report_id' => $report->id, 'error' => $e->getMessage()]);
        }

        return redirect()->route('citizen.home')->with('success', 'Reporte creado exitosamente.');
    }

    public function show(Report $report): JsonResponse
    {
        $report->load([
            'user:id,first_name,last_name,profile_photo',
            'incidentType:id,name',
            'images',
            'statusHistory.changedBy:id,first_name,last_name',
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
            'media'            => ['nullable', 'array'],
            'media.*'          => ['file', 'mimetypes:image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm', 'max:51200'],
        ]);

        $report->update(array_merge(collect($data)->except('media')->all(), ['is_edited' => true, 'edited_at' => now()]));

        $this->storeMediaFiles($report, $request);

        return back()->with('success', 'Reporte actualizado.');
    }

    /**
     * Persists every uploaded photo/video as its own ReportImage row, in the order the
     * citizen attached them — that insertion order is what lets the AI services reliably
     * pick "the first photo" later (see DuplicateDetectionService::generateEmbeddingForReport).
     */
    private function storeMediaFiles(Report $report, Request $request): void
    {
        foreach ($request->file('media', []) as $file) {
            $path = $file->store('reportes', 'public');
            $report->images()->create([
                'path' => $path,
                'type' => str_starts_with($file->getMimeType(), 'video/') ? 'video' : 'image',
            ]);
        }
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

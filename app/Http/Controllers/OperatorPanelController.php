<?php

namespace App\Http\Controllers;

use App\Events\OperatorLocationUpdated;
use App\Events\ReportStatusChanged;
use App\Http\Controllers\Concerns\ScopesToEntity;
use App\Jobs\NotifyAllCitizensOfResolution;
use App\Models\Report;
use App\Models\ReportStatusHistory;
use App\Services\NotificationService;
use App\Support\Geo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OperatorPanelController extends Controller
{
    use ScopesToEntity;

    private const GEOFENCE_METERS = 10;

    public function __construct(private NotificationService $notifications) {}

    public function dashboard(Request $request): Response
    {
        $typeIds = $this->entityIncidentTypeIds($request);
        $userId = $request->user()->id;

        $available = Report::whereIn('incident_type_id', $typeIds)
            ->where('status', 'notificado')
            ->whereNull('claimed_by_user_id')
            ->with(['user:id,first_name,last_name', 'incidentType:id,name'])
            ->latest()
            ->get();

        $mine = Report::whereIn('incident_type_id', $typeIds)
            ->where('claimed_by_user_id', $userId)
            ->where('status', '!=', 'resuelto')
            ->with(['user:id,first_name,last_name', 'incidentType:id,name'])
            ->latest()
            ->get();

        return Inertia::render('Operator/Dashboard', [
            'available' => $available,
            'mine'      => $mine,
        ]);
    }

    public function claim(Request $request, Report $report): RedirectResponse
    {
        $this->authorizeForEntity($request, $report);

        $claimed = DB::transaction(function () use ($request, $report) {
            $fresh = Report::lockForUpdate()->find($report->id);

            if ($fresh->claimed_by_user_id !== null || $fresh->status !== 'notificado') {
                return false;
            }

            $fresh->update([
                'claimed_by_user_id' => $request->user()->id,
                'claimed_at'         => now(),
            ]);

            return true;
        });

        if (!$claimed) {
            return back()->with('error', 'Este reporte ya no está disponible para tomar (otro operador lo tomó o ya cambió de estado).');
        }

        $this->applyStatusChange($request, $report->fresh(), 'en_camino');

        return redirect("/operador/reportes/{$report->id}")->with('success', 'Reporte tomado. Dirígete al sitio.');
    }

    public function show(Request $request, Report $report): Response
    {
        $this->authorizeForEntity($request, $report);

        abort_unless($report->claimed_by_user_id === $request->user()->id, 403, 'No has tomado este reporte.');

        $report->load(['user:id,first_name,last_name', 'incidentType:id,name', 'images']);

        return Inertia::render('Operator/Navigate', ['report' => $report]);
    }

    public function markEnProceso(Request $request, Report $report): RedirectResponse
    {
        $this->authorizeOperatorAction($request, $report, 'en_revision');

        $this->assertWithinGeofence($request, $report);

        $this->applyStatusChange($request, $report, 'en_proceso');

        return back()->with('success', 'Reporte marcado como en proceso.');
    }

    public function resolve(Request $request, Report $report): RedirectResponse
    {
        $this->authorizeOperatorAction($request, $report, 'en_proceso');

        $this->assertWithinGeofence($request, $report);

        $request->validate([
            'evidence'   => ['required', 'array', 'min:1'],
            'evidence.*' => ['file', 'mimetypes:image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm', 'max:51200'],
        ]);

        foreach ($request->file('evidence') as $file) {
            $path = $file->store('evidencias', 'public');
            $report->images()->create([
                'path' => $path,
                'type' => str_starts_with($file->getMimeType(), 'video/') ? 'video' : 'image',
                'kind' => 'evidencia',
            ]);
        }

        $this->applyStatusChange($request, $report, 'resuelto');

        NotifyAllCitizensOfResolution::dispatch($report);

        return back()->with('success', 'Reporte marcado como resuelto.');
    }

    public function updateLocation(Request $request)
    {
        $data = $request->validate([
            'latitude'  => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'report_id' => ['nullable', 'integer', 'exists:reports,id'],
        ]);

        $operator = $request->user();
        $operator->update([
            'current_latitude'    => $data['latitude'],
            'current_longitude'   => $data['longitude'],
            'location_updated_at' => now(),
        ]);

        try {
            broadcast(new OperatorLocationUpdated($operator));
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed for OperatorLocationUpdated', ['user_id' => $operator->id, 'error' => $e->getMessage()]);
        }

        // "En camino" → "En revisión" happens automatically the moment the operator's own
        // GPS confirms they're on site — no button, no extra trust in the client's say-so
        // since the distance is computed here from the same coordinates just persisted.
        if (!empty($data['report_id'])) {
            $report = Report::find($data['report_id']);

            if ($report
                && $report->claimed_by_user_id === $operator->id
                && $report->status === 'en_camino'
            ) {
                $distance = Geo::distanceInMeters($data['latitude'], $data['longitude'], $report->latitude, $report->longitude);

                if ($distance <= self::GEOFENCE_METERS) {
                    $this->applyStatusChange($request, $report, 'en_revision');
                    $report->refresh();
                }
            }

            return response()->json(['status' => $report?->status]);
        }

        return response()->json(['ok' => true]);
    }

    private function authorizeOperatorAction(Request $request, Report $report, string $requiredCurrentStatus): void
    {
        $this->authorizeForEntity($request, $report);

        abort_unless($report->claimed_by_user_id === $request->user()->id, 403, 'No has tomado este reporte.');

        abort_unless(
            $report->status === $requiredCurrentStatus,
            409,
            "El reporte debe estar en estado \"{$requiredCurrentStatus}\" para esta acción.",
        );
    }

    private function assertWithinGeofence(Request $request, Report $report): void
    {
        $data = $request->validate([
            'latitude'  => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $distance = Geo::distanceInMeters($data['latitude'], $data['longitude'], $report->latitude, $report->longitude);

        if ($distance > self::GEOFENCE_METERS) {
            throw ValidationException::withMessages([
                'latitude' => "Debes estar a menos de " . self::GEOFENCE_METERS . " metros del incidente (estás a " . round($distance) . " m).",
            ]);
        }
    }

    private function applyStatusChange(Request $request, Report $report, string $newStatus): void
    {
        ReportStatusHistory::create([
            'report_id'          => $report->id,
            'previous_status'    => $report->status,
            'new_status'         => $newStatus,
            'changed_by_user_id' => $request->user()->id,
        ]);

        $previousStatus = $report->status;
        $report->update(['status' => $newStatus]);

        $this->notifications->notifyStatusChange(
            reportOwnerId: $report->user_id,
            reportId: $report->id,
            newStatus: $newStatus,
            incidentTypeName: $report->incidentType->name,
            actorId: $request->user()->id,
        );

        try {
            broadcast(new ReportStatusChanged($report, $previousStatus));
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed for ReportStatusChanged', ['report_id' => $report->id, 'error' => $e->getMessage()]);
        }
    }
}

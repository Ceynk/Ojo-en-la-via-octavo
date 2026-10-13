<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AdminReportController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    public function index(Request $request): Response
    {
        $query = Report::with(['user:id,first_name,last_name', 'incidentType:id,name', 'originalReport:id,description'])
            ->withCount(['likes', 'comments', 'confirmations']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('incident_type_id', $request->type);
        }

        // Review queue (RF-14): "sin_revisar" is what's still waiting for an admin.
        match ($request->input('validation')) {
            'sin_revisar' => $query->whereNull('validation_status'),
            'valido', 'invalido' => $query->where('validation_status', $request->input('validation')),
            default => null,
        };

        if ($request->input('sort') === 'support') {
            $query->orderBySupport();
        }

        $reports = $query->latest()->paginate(20)->withQueryString();

        return Inertia::render('Admin/Reports/Index', [
            'reports' => $reports,
            'filters' => $request->only(['status', 'type', 'validation', 'sort']),
        ]);
    }

    public function show(Report $report): Response
    {
        $report->load([
            'user:id,first_name,last_name,email',
            'incidentType:id,name',
            'images',
            'statusHistory.changedBy:id,first_name,last_name',
            'entityNotifications',
            'validatedBy:id,first_name,last_name',
        ]);
        $report->loadCount(['likes', 'comments', 'confirmations']);

        return Inertia::render('Admin/Reports/Show', ['report' => $report]);
    }

    /**
     * RF-14: the admin reviews the content. "Inválido" (spam, not a road incident, offensive
     * photo…) takes it off the public map, the entity panel and the operators' queue; the
     * author is told why. It can be reverted by validating it again.
     */
    public function validateContent(Request $request, Report $report): RedirectResponse
    {
        $data = $request->validate([
            'validation_status' => ['required', 'in:valido,invalido'],
            'validation_notes'  => ['required_if:validation_status,invalido', 'nullable', 'string', 'max:500'],
        ], [
            'validation_notes.required_if' => 'Indica el motivo por el que el reporte no es válido.',
        ]);

        $report->update([
            'validation_status'    => $data['validation_status'],
            'validation_notes'     => $data['validation_notes'] ?? null,
            'validated_by_user_id' => $request->user()->id,
            'validated_at'         => now(),
        ]);

        if ($data['validation_status'] === 'invalido') {
            $this->notifications->create(
                userId: $report->user_id,
                actorId: $request->user()->id,
                type: 'reporte_invalido',
                title: 'Tu reporte no fue aprobado',
                message: "Tu reporte #{$report->id} fue marcado como no válido: {$data['validation_notes']}",
                reportId: $report->id,
            );
        }

        return back()->with('success', $data['validation_status'] === 'valido'
            ? 'Reporte validado.'
            : 'Reporte marcado como no válido y ocultado del mapa.');
    }

    public function destroy(Report $report): RedirectResponse
    {
        foreach ($report->images as $image) {
            Storage::disk('public')->delete($image->path);
        }

        $report->delete();

        return redirect()->route('admin.reports.index')->with('success', 'Reporte eliminado.');
    }
}

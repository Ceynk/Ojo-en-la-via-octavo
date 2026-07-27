<?php

namespace App\Http\Controllers\Admin;

use App\Events\ReportStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportStatusHistory;
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
        $query = Report::with(['user:id,name', 'incidentType:id,name'])
            ->withCount(['likes', 'comments']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('incident_type_id', $request->type);
        }

        $reports = $query->latest()->paginate(20)->withQueryString();

        return Inertia::render('Admin/Reports/Index', [
            'reports' => $reports,
            'filters' => $request->only(['status', 'type']),
        ]);
    }

    public function show(Report $report): Response
    {
        $report->load([
            'user:id,name,email',
            'incidentType:id,name',
            'images',
            'statusHistory.changedBy:id,name',
            'entityNotifications',
        ]);
        $report->loadCount(['likes', 'comments']);

        return Inertia::render('Admin/Reports/Show', ['report' => $report]);
    }

    public function updateStatus(Request $request, Report $report): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pendiente,en_revision,notificado,resuelto'],
            'notes'  => ['nullable', 'string', 'max:500'],
        ]);

        ReportStatusHistory::create([
            'report_id'          => $report->id,
            'previous_status'    => $report->status,
            'new_status'         => $data['status'],
            'changed_by_user_id' => $request->user()->id,
            'notes'              => $data['notes'] ?? null,
        ]);

        $previousStatus = $report->status;
        $report->update(['status' => $data['status']]);

        $this->notifications->notifyStatusChange(
            reportOwnerId: $report->user_id,
            reportId: $report->id,
            newStatus: $data['status'],
            actorId: $request->user()->id,
        );

        broadcast(new ReportStatusChanged($report, $previousStatus));

        return back()->with('success', 'Estado actualizado.');
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

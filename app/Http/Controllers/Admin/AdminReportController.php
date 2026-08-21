<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AdminReportController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Report::with(['user:id,first_name,last_name', 'incidentType:id,name', 'originalReport:id,description'])
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
            'user:id,first_name,last_name,email',
            'incidentType:id,name',
            'images',
            'statusHistory.changedBy:id,first_name,last_name',
            'entityNotifications',
        ]);
        $report->loadCount(['likes', 'comments']);

        return Inertia::render('Admin/Reports/Show', ['report' => $report]);
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

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class AdminExportController extends Controller
{
    public function index(): InertiaResponse
    {
        $total = Report::count();

        return Inertia::render('Admin/Export', [
            'total_reports' => $total,
        ]);
    }

    public function export(Request $request): Response
    {
        $request->validate([
            'from'   => ['nullable', 'date'],
            'to'     => ['nullable', 'date'],
            'status' => ['nullable', 'in:pendiente,en_revision,notificado,resuelto'],
        ]);

        $query = Report::with(['user:id,first_name,last_name,email', 'incidentType:id,name']);

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $reports = $query->latest()->get();

        $csv = implode(',', ['ID', 'Tipo', 'Descripción', 'Estado', 'Dirección', 'Latitud', 'Longitud', 'Usuario', 'Email', 'Fecha']) . "\n";

        foreach ($reports as $report) {
            $csv .= implode(',', [
                $report->id,
                '"' . ($report->incidentType?->name ?? '') . '"',
                '"' . str_replace('"', '""', $report->description) . '"',
                $report->status,
                '"' . str_replace('"', '""', $report->address_text) . '"',
                $report->latitude,
                $report->longitude,
                '"' . ($report->user?->name ?? '') . '"',
                '"' . ($report->user?->email ?? '') . '"',
                $report->created_at->toDateTimeString(),
            ]) . "\n";
        }

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="reportes_' . now()->format('Y-m-d') . '.csv"',
        ]);
    }
}

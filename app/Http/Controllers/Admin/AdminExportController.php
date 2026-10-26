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
            'status' => ['nullable', 'in:pendiente,notificado,en_camino,en_revision,en_proceso,resuelto'],
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

        $reports = $query->withCount(['likes', 'confirmations'])->latest()->get();

        // fputcsv handles quoting/escaping of every field (names with quotes, descriptions
        // with commas or line breaks); the BOM makes Excel read the accents as UTF-8.
        $out = fopen('php://temp', 'r+');
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, ['ID', 'Tipo', 'Descripción', 'Estado', 'Validación', 'Dirección', 'Latitud', 'Longitud', 'Apoyos', 'Usuario', 'Email', 'Fecha'], escape: '');

        foreach ($reports as $report) {
            fputcsv($out, [
                $report->id,
                $report->incidentType?->name ?? '',
                $report->description,
                $report->status,
                $report->validation_status ?? 'sin_revisar',
                $report->address_text,
                $report->latitude,
                $report->longitude,
                $report->likes_count + $report->confirmations_count,
                $report->user?->name ?? '',
                $report->user?->email ?? '',
                $report->created_at->toDateTimeString(),
            ], escape: '');
        }

        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="reportes_' . now()->format('Y-m-d') . '.csv"',
        ]);
    }
}

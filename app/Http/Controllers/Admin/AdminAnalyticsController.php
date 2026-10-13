<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminAnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days)->startOfDay();

        $data = Cache::remember("analytics_{$days}", 300, function () use ($from, $days) {
            $reportsByType = Report::select('incident_type_id', DB::raw('count(*) as total'))
                ->with('incidentType:id,name')
                ->where('created_at', '>=', $from)
                ->groupBy('incident_type_id')
                ->get()
                ->map(fn ($r) => ['name' => $r->incidentType?->name, 'total' => $r->total]);

            $byStatus = Report::select('status', DB::raw('count(*) as total'))
                ->where('created_at', '>=', $from)
                ->groupBy('status')
                ->pluck('total', 'status');

            // DATE() works on both SQLite and PostgreSQL
            $trend = Report::select(
                    DB::raw('DATE(created_at) as day'),
                    DB::raw('count(*) as total'),
                    DB::raw("sum(case when status = 'resuelto' then 1 else 0 end) as resolved")
                )
                ->where('created_at', '>=', $from)
                ->groupBy('day')
                ->orderBy('day')
                ->get();

            $activeUsers = User::where('role', 'ciudadano')
                ->whereHas('reports', fn ($q) => $q->where('created_at', '>=', $from))
                ->withCount(['reports' => fn ($q) => $q->where('created_at', '>=', $from)])
                ->orderByDesc('reports_count')
                ->limit(10)
                ->get(['id', 'first_name', 'last_name', 'email', 'is_active']);

            $zones = $this->zones($from);

            return compact('reportsByType', 'byStatus', 'trend', 'activeUsers', 'zones');
        });

        return Inertia::render('Admin/Analytics/Index', [
            'data' => $data,
            'days' => $days,
        ]);
    }

    /**
     * RF-32 — incidents by zone. Reports only carry coordinates (no neighborhood field), so
     * zones are a fixed grid of ZONE_CELL_DEG degrees (~550 m in Villavicencio): every report
     * falls in exactly one cell, cells are stable between periods and nothing depends on an
     * external geocoder. Each zone reports its center, totals per status and its most
     * frequent incident type, sorted by volume.
     */
    private const ZONE_CELL_DEG = 0.005;

    private function zones(\DateTimeInterface $from): array
    {
        $reports = Report::with('incidentType:id,name')
            ->where('created_at', '>=', $from)
            ->get(['id', 'latitude', 'longitude', 'status', 'incident_type_id', 'address_text']);

        return $reports
            ->groupBy(fn ($r) => floor($r->latitude / self::ZONE_CELL_DEG) . ':' . floor($r->longitude / self::ZONE_CELL_DEG))
            ->map(function ($group) {
                $sample = $group->first();
                $topType = $group->countBy(fn ($r) => $r->incidentType?->name ?? 'Sin categoría')->sortDesc();

                return [
                    'lat'      => round((floor($sample->latitude / self::ZONE_CELL_DEG) + 0.5) * self::ZONE_CELL_DEG, 5),
                    'lng'      => round((floor($sample->longitude / self::ZONE_CELL_DEG) + 0.5) * self::ZONE_CELL_DEG, 5),
                    'total'    => $group->count(),
                    'resolved' => $group->where('status', 'resuelto')->count(),
                    'open'     => $group->where('status', '!=', 'resuelto')->count(),
                    'by_status' => $group->countBy('status'),
                    'top_type' => $topType->keys()->first(),
                    // A real address from inside the cell so the table reads as a place.
                    'reference' => $sample->address_text,
                ];
            })
            ->sortByDesc('total')
            ->values()
            ->take(50)
            ->all();
    }
}

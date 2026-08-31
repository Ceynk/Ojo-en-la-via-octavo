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

            return compact('reportsByType', 'byStatus', 'trend', 'activeUsers');
        });

        return Inertia::render('Admin/Analytics/Index', [
            'data' => $data,
            'days' => $days,
        ]);
    }
}

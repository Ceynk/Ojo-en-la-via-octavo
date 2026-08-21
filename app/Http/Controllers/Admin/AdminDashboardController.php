<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        $stats = [
            'total_reports'    => Report::count(),
            'pending_reports'  => Report::where('status', 'pendiente')->count(),
            'resolved_reports' => Report::where('status', 'resuelto')->count(),
            'total_users'      => User::where('role', 'ciudadano')->count(),
            'active_users'     => User::where('role', 'ciudadano')->where('is_active', true)->count(),
        ];

        $recent_reports = Report::with(['user:id,first_name,last_name', 'incidentType:id,name'])
            ->withCount('likes')
            ->latest()
            ->limit(10)
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'stats'          => $stats,
            'recent_reports' => $recent_reports,
        ]);
    }
}

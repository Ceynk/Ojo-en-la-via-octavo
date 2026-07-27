<?php

namespace App\Http\Controllers;

use App\Models\EntityNotification;
use App\Models\ReportStatusHistory;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EntityUpdateController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    public function show(string $token): Response|RedirectResponse
    {
        $entityNotif = EntityNotification::where('token', $token)->first();

        if (!$entityNotif || !$entityNotif->isTokenValid()) {
            return Inertia::render('Entity/InvalidToken');
        }

        $entityNotif->update(['status' => 'vista']);

        return Inertia::render('Entity/Update', [
            'token'  => $token,
            'report' => $entityNotif->report->load('incidentType'),
        ]);
    }

    public function update(Request $request, string $token): RedirectResponse
    {
        $entityNotif = EntityNotification::where('token', $token)->first();

        if (!$entityNotif || !$entityNotif->isTokenValid()) {
            return redirect()->back()->withErrors(['token' => 'Enlace inválido o expirado.']);
        }

        $data = $request->validate([
            'status' => ['required', 'in:en_revision,resuelto'],
            'notes'  => ['nullable', 'string', 'max:500'],
        ]);

        $report = $entityNotif->report;

        ReportStatusHistory::create([
            'report_id'          => $report->id,
            'previous_status'    => $report->status,
            'new_status'         => $data['status'],
            'changed_by_entity'  => $entityNotif->entity_email,
            'notes'              => $data['notes'] ?? null,
        ]);

        $report->update(['status' => $data['status']]);

        $entityNotif->update([
            'status'     => 'actualizada',
            'token_used' => true,
        ]);

        $this->notifications->notifyStatusChange(
            reportOwnerId: $report->user_id,
            reportId: $report->id,
            newStatus: $data['status'],
        );

        return Inertia::location(route('entity.update', $token));
    }
}

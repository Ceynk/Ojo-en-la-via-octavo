<?php

namespace App\Services;

use App\Events\ReportStatusChanged;
use App\Models\Report;
use App\Models\ReportStatusHistory;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * The one place a report's status changes. Every transition — operator in the field,
 * entity panel, or the system itself (entities notified) — goes through here so that it
 * always: lands in the status history with who/when/notes (RF-28), notifies the citizen
 * in-app (RF-29) and is pushed live over the websocket.
 */
class ReportStatusService
{
    public function __construct(private NotificationService $notifications) {}

    /**
     * @param  User|null  $actor  null for automatic/system transitions (shown as "Sistema").
     */
    public function change(Report $report, string $newStatus, ?User $actor, ?string $notes = null): void
    {
        if ($report->status === $newStatus) {
            return;
        }

        $previousStatus = $report->status;

        ReportStatusHistory::create([
            'report_id'          => $report->id,
            'previous_status'    => $previousStatus,
            'new_status'         => $newStatus,
            'changed_by_user_id' => $actor?->id,
            'notes'              => $notes,
        ]);

        $report->update(['status' => $newStatus]);

        $this->notifications->notifyStatusChange(
            reportOwnerId: $report->user_id,
            reportId: $report->id,
            newStatus: $newStatus,
            incidentTypeName: $report->incidentType?->name ?? 'incidente',
            actorId: $actor?->id,
        );

        // Best-effort: the change is already saved, a websocket outage must not undo it.
        try {
            broadcast(new ReportStatusChanged($report, $previousStatus));
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed for ReportStatusChanged', ['report_id' => $report->id, 'error' => $e->getMessage()]);
        }
    }
}

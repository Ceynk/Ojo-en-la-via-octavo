<?php

namespace App\Jobs;

use App\Mail\EntityNotificationMail;
use App\Models\Entity;
use App\Models\EntityNotification;
use App\Models\Report;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class NotifyEntitiesOfReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Report $report) {}

    public function handle(): void
    {
        $entities = Entity::active()
            ->forIncidentType($this->report->incident_type_id)
            ->with(['users' => fn ($q) => $q->where('is_active', true)])
            ->get();

        if ($entities->isEmpty()) {
            return;
        }

        $notifiedCount = 0;

        foreach ($entities as $entity) {
            $sent = $this->notifyEntity($entity);
            $notifiedCount += $sent;
        }

        if ($notifiedCount > 0) {
            $this->report->update(['status' => 'notificado']);
        }
    }

    /**
     * Notifies every recipient with access for this entity — the institutional contact
     * address (entity_email) plus every active entity_id user — since only the latter can
     * actually log into the panel to act on the report. Deduplicated by email so an entity
     * user whose account email matches entity_email isn't emailed twice.
     */
    private function notifyEntity(Entity $entity): int
    {
        app(NotificationService::class)->notifyEntityNewReport($entity, $this->report);

        $recipients = collect();

        if (!empty($entity->entity_email)) {
            $recipients->push(['email' => $entity->entity_email, 'name' => null]);
        }

        foreach ($entity->users as $user) {
            if ($user->notify_by_email) {
                $recipients->push(['email' => $user->email, 'name' => $user->name]);
            }
        }

        $recipients = $recipients->unique(fn ($r) => strtolower($r['email']));

        if ($recipients->isEmpty()) {
            Log::warning('Entity has no notification recipients', [
                'report_id' => $this->report->id,
                'entity_id' => $entity->id,
                'entity_name' => $entity->name,
            ]);

            return 0;
        }

        $sent = 0;

        foreach ($recipients as $recipient) {
            try {
                $this->notifyRecipient($entity, $recipient['email'], $recipient['name']);
                $sent++;
            } catch (Throwable $e) {
                // One recipient's mail/config problem must never stop the others from being
                // notified, and must never bubble up to fail report creation.
                Log::error('Failed to notify entity recipient of report', [
                    'report_id' => $this->report->id,
                    'entity_id' => $entity->id,
                    'entity_name' => $entity->name,
                    'recipient' => $recipient['email'],
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $sent;
    }

    private function notifyRecipient(Entity $entity, string $email, ?string $name): void
    {
        ['subject' => $subject, 'message' => $message] = $entity->renderMessage($this->report);

        // Audit trail only, same as the legacy flow — but without token/token_expires_at,
        // since entity access is via login-based auth, not magic links.
        $entityNotification = EntityNotification::create([
            'report_id'    => $this->report->id,
            'entity_email' => $email,
            'subject'      => $subject,
            'message'      => $message,
            'priority'     => $entity->priority,
            'status'       => 'enviada',
        ]);

        Mail::to($email)->queue(
            new EntityNotificationMail($entityNotification, $this->report, $entity->name, $name)
        );
    }
}

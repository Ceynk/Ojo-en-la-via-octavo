<?php

namespace App\Services;

use App\Mail\EntityNotificationMail;
use App\Models\EntityNotification;
use App\Models\NotificationRule;
use App\Models\Report;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class EntityNotificationService
{
    public function dispatch(Report $report): void
    {
        $rule = NotificationRule::where('incident_type_id', $report->incident_type_id)
            ->where('is_active', true)
            ->first();

        if (!$rule) {
            return;
        }

        $token   = Str::random(64);
        $subject = $rule->renderSubject($report);
        $message = $rule->renderMessage($report);

        $entityNotification = EntityNotification::create([
            'report_id'        => $report->id,
            'rule_id'          => $rule->id,
            'entity_email'     => $rule->entity_email,
            'subject'          => $subject,
            'message'          => $message,
            'priority'         => $rule->priority,
            'token'            => $token,
            'token_expires_at' => now()->addDays(7),
        ]);

        $report->update(['status' => 'notificado']);

        Mail::to($rule->entity_email)->queue(
            new EntityNotificationMail($entityNotification, $report, $token)
        );
    }
}

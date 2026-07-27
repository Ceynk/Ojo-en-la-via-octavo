<?php

namespace App\Services;

use App\Models\Notification;

class NotificationService
{
    public function create(
        int $userId,
        ?int $actorId,
        string $type,
        string $title,
        string $message,
        ?int $reportId = null,
        ?int $commentId = null,
    ): Notification {
        return Notification::create([
            'user_id'    => $userId,
            'actor_id'   => $actorId,
            'type'       => $type,
            'title'      => $title,
            'message'    => $message,
            'report_id'  => $reportId,
            'comment_id' => $commentId,
        ]);
    }

    public function notifyStatusChange(
        int $reportOwnerId,
        int $reportId,
        string $newStatus,
        ?int $actorId = null,
    ): void {
        $labels = [
            'pendiente'   => 'Pendiente',
            'en_revision' => 'En revisión',
            'notificado'  => 'Notificado a la entidad',
            'resuelto'    => 'Resuelto',
        ];

        $this->create(
            userId: $reportOwnerId,
            actorId: $actorId,
            type: 'estado_reporte',
            title: 'Estado de reporte actualizado',
            message: 'Tu reporte cambió de estado a: ' . ($labels[$newStatus] ?? $newStatus),
            reportId: $reportId,
        );
    }
}

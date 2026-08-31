<?php

namespace App\Services;

use App\Models\Comment;
use App\Models\Entity;
use App\Models\Notification;
use App\Models\Report;

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
        string $incidentTypeName,
        ?int $actorId = null,
    ): void {
        $labels = [
            'pendiente'   => 'Pendiente',
            'notificado'  => 'Notificado a la entidad',
            'en_camino'   => 'Un operador va en camino',
            'en_revision' => 'En revisión',
            'en_proceso'  => 'En proceso',
            'resuelto'    => 'Resuelto',
        ];

        $this->create(
            userId: $reportOwnerId,
            actorId: $actorId,
            type: 'estado_reporte',
            title: 'Estado de reporte actualizado',
            message: "Tu reporte de {$incidentTypeName} cambió a " . ($labels[$newStatus] ?? $newStatus),
            reportId: $reportId,
        );
    }

    public function notifyEntityNewReport(Entity $entity, Report $report): void
    {
        $incidentTypeName = $report->incidentType?->name ?? 'Sin categoría';

        foreach ($entity->users()->where('is_active', true)->get() as $user) {
            $this->create(
                userId: $user->id,
                actorId: null,
                type: 'nuevo_reporte_entidad',
                title: 'Nuevo reporte asignado',
                message: "Se asignó un nuevo reporte de {$incidentTypeName} a {$entity->name}.",
                reportId: $report->id,
            );
        }
    }

    public function notifyEntityNewComment(Entity $entity, Report $report, Comment $comment, int $actorId): void
    {
        foreach ($entity->users()->where('is_active', true)->where('id', '!=', $actorId)->get() as $user) {
            $this->create(
                userId: $user->id,
                actorId: $actorId,
                type: 'comentario_entidad',
                title: 'Nuevo comentario en reporte asignado',
                message: "Hay un nuevo comentario en el reporte #{$report->id} asignado a {$entity->name}.",
                reportId: $report->id,
                commentId: $comment->id,
            );
        }
    }
}

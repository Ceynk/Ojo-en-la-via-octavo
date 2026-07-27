<?php

namespace App\Mail;

use App\Models\EntityNotification;
use App\Models\Report;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EntityNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public EntityNotification $entityNotification,
        public Report $report,
        public string $token,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->entityNotification->subject);
    }

    public function content(): Content
    {
        $updateUrl = route('entity.update', $this->token);
        $priority  = strtoupper($this->entityNotification->priority);

        return new Content(
            htmlString: "
                <h2>Notificación de incidente — Prioridad {$priority}</h2>
                <p>{$this->entityNotification->message}</p>
                <hr>
                <p><strong>Dirección:</strong> {$this->report->address_text}</p>
                <p><strong>Tipo:</strong> {$this->report->incidentType?->name}</p>
                <p><strong>Descripción:</strong> {$this->report->description}</p>
                <p>Para actualizar el estado de este reporte, haz clic en el siguiente enlace:</p>
                <p><a href='{$updateUrl}' style='background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:16px 0'>Actualizar estado del reporte</a></p>
                <p><small>Este enlace es de un solo uso y expira en 7 días.</small></p>
            ",
        );
    }
}

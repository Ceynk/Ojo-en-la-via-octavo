<?php

namespace App\Mail;

use App\Models\Report;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class IncidentResolvedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Report $report) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Incidente resuelto — Ojo en la Vía');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.incident-resolved',
            with: [
                'incidentTypeName' => $this->report->incidentType?->name ?? 'incidente',
                'addressText'      => $this->report->address_text,
                'entityName'       => $this->report->claimedBy?->entity?->name ?? 'la entidad responsable',
                // No hay página individual pública para un reporte — se enlaza al feed
                // general de reportes, que sí es una ruta real (`citizen.reports`).
                'reportUrl'        => url('/reportes'),
            ],
        );
    }
}

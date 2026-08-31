<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EntityInviteMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $token,
        public string $userName,
        public string $entityName,
        public string $panelLabel = 'entidad',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Invitación al panel de {$this->panelLabel} — Ojo en la Vía");
    }

    public function content(): Content
    {
        $url = url('/reset-password/' . $this->token);

        return new Content(
            htmlString: "
                <h2>Hola, {$this->userName}</h2>
                <p>Se creó una cuenta para ti en el panel de {$this->panelLabel} de Ojo en la Vía, en representación de <strong>{$this->entityName}</strong>.</p>
                <p>Para activar tu cuenta, define tu contraseña haciendo clic en el siguiente enlace:</p>
                <p><a href='{$url}' style='background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:16px 0'>Establecer contraseña</a></p>
                <p>Este enlace expira en 1 hora. Si crees que recibiste esto por error, ignora este email.</p>
                <p>— El equipo de Ojo en la Vía</p>
            ",
        );
    }
}

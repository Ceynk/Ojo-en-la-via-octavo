<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $token,
        public string $userName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Restablecer contraseña — Ojo en la Vía');
    }

    public function content(): Content
    {
        $url = url('/reset-password/' . $this->token);

        return new Content(
            htmlString: "
                <h2>Hola, {$this->userName}</h2>
                <p>Recibiste este email porque solicitaste restablecer tu contraseña.</p>
                <p><a href='{$url}' style='background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:16px 0'>Restablecer contraseña</a></p>
                <p>Este enlace expira en 1 hora. Si no solicitaste esto, ignora este email.</p>
                <p>— El equipo de Ojo en la Vía</p>
            ",
        );
    }
}

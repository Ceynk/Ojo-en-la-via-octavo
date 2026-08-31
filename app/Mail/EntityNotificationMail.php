<?php

namespace App\Mail;

use App\Models\EntityNotification;
use App\Models\Report;
use App\Models\ReportImage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class EntityNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public EntityNotification $entityNotification,
        public Report $report,
        public string $entityName,
        public ?string $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->entityNotification->subject);
    }

    public function content(): Content
    {
        $priorityStyles = [
            'alta'  => ['bg' => '#7f1d1d', 'text' => '#fca5a5', 'label' => 'ALTA'],
            'media' => ['bg' => '#78350f', 'text' => '#fcd34d', 'label' => 'MEDIA'],
            'baja'  => ['bg' => '#064e3b', 'text' => '#6ee7b7', 'label' => 'BAJA'],
        ];
        $priority = $priorityStyles[$this->entityNotification->priority] ?? $priorityStyles['media'];

        $firstImage = $this->report->images->first();

        return new Content(
            view: 'emails.entity-notification',
            with: [
                'subject'          => $this->entityNotification->subject,
                'bodyMessage'      => $this->entityNotification->message,
                'entityName'       => $this->entityName,
                'recipientName'    => $this->recipientName,
                'incidentTypeName' => $this->report->incidentType?->name ?? 'Sin categoría',
                'addressText'      => $this->report->address_text,
                'description'      => $this->report->description,
                'imageFile'        => $this->inlineImage($firstImage),
                'loginUrl'         => route('login', ['redirect' => '/entidad/dashboard']),
                'priorityBg'       => $priority['bg'],
                'priorityText'     => $priority['text'],
                'priorityLabel'    => $priority['label'],
            ],
        );
    }

    /**
     * Mail clients can't reach local/storage URLs (e.g. 127.0.0.1). CID embedding
     * (Message::embedData()) doesn't work here either: Brevo's transactional API has no
     * concept of an inline/related part — its Symfony transport dumps every embedded part
     * into the same generic "attachment" field as regular attachments, so the photo showed
     * up as a file attached to the email but never rendered inside the body. A base64 data
     * URI baked directly into the HTML sidesteps Brevo's attachment handling entirely.
     * Returns null, or a ready-to-use "data:<mime>;base64,..." string.
     */
    private function inlineImage(?ReportImage $reportImage): ?string
    {
        if (!$reportImage || !Storage::disk('public')->exists($reportImage->path)) {
            return null;
        }

        $mime = Storage::disk('public')->mimeType($reportImage->path) ?: 'image/jpeg';
        $data = Storage::disk('public')->get($reportImage->path);

        // Report photos can be webp/avif/etc (the citizen upload form accepts them); keep
        // the JPEG re-encode for those so every mail client can decode the image, not just
        // ones with modern format support.
        if (! in_array($mime, ['image/jpeg', 'image/png', 'image/gif'], true)) {
            $jpeg = $this->convertToJpeg($data);

            if ($jpeg === null) {
                return null;
            }

            return 'data:image/jpeg;base64,' . base64_encode($jpeg);
        }

        return "data:{$mime};base64," . base64_encode($data);
    }

    private function convertToJpeg(string $data): ?string
    {
        $image = @imagecreatefromstring($data);

        if ($image === false) {
            return null;
        }

        ob_start();
        imagejpeg($image, null, 85);
        $jpeg = ob_get_clean();
        imagedestroy($image);

        return $jpeg ?: null;
    }
}

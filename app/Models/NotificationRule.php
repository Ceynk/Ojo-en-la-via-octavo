<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NotificationRule extends Model
{
    protected $fillable = [
        'incident_type_id',
        'entity_email',
        'subject_template',
        'message_template',
        'priority',
        'is_active',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function incidentType(): BelongsTo
    {
        return $this->belongsTo(IncidentType::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function entityNotifications(): HasMany
    {
        return $this->hasMany(EntityNotification::class, 'rule_id');
    }

    public function renderSubject(Report $report): string
    {
        return strtr($this->subject_template, [
            '{tipo}'       => $report->incidentType?->name ?? '',
            '{direccion}'  => $report->address_text,
            '{reporte_id}' => $report->id,
        ]);
    }

    public function renderMessage(Report $report): string
    {
        return strtr($this->message_template, [
            '{tipo}'       => $report->incidentType?->name ?? '',
            '{direccion}'  => $report->address_text,
            '{reporte_id}' => $report->id,
        ]);
    }
}

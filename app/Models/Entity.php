<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Entity extends Model
{
    protected $fillable = [
        'name',
        'description',
        'entity_email',
        'is_active',
        'subject_template',
        'message_template',
        'priority',
        'logo_path',
        'motto',
        'website_url',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function incidentTypes(): BelongsToMany
    {
        return $this->belongsToMany(IncidentType::class, 'entity_incident_type');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeForIncidentType(Builder $query, int $incidentTypeId): Builder
    {
        return $query->whereHas('incidentTypes', fn ($q) => $q->where('incident_types.id', $incidentTypeId));
    }

    /**
     * Renders subject_template/message_template for a given report.
     *
     * Supported placeholders: {tipo}, {direccion}, {reporte_id}, {id} (alias of
     * {reporte_id}), {descripcion}. {enlace} is intentionally not supported — magic-link
     * emails are being replaced by the entity login panel (phase 4), so there is no per-report
     * URL to substitute here.
     */
    public function renderMessage(Report $report): array
    {
        $replacements = [
            '{tipo}'         => $report->incidentType?->name ?? '',
            '{direccion}'    => $report->address_text,
            '{reporte_id}'   => $report->id,
            '{id}'           => $report->id,
            '{descripcion}'  => $report->description,
        ];

        // subject_template/message_template are optional in the admin form — an entity
        // created without them must still produce a usable email instead of a blank
        // subject/body (which is what silently went out for every entity until now).
        $subjectTemplate = $this->subject_template ?: 'Nuevo reporte de {tipo} — {direccion}';
        $messageTemplate = $this->message_template
            ?: "Se registró un nuevo reporte de {tipo} en {direccion}.\n\nDescripción: {descripcion}\n\nReporte #{id}.";

        return [
            'subject' => strtr($subjectTemplate, $replacements),
            'message' => strtr($messageTemplate, $replacements),
        ];
    }
}

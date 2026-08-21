<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Report;
use Illuminate\Http\Request;

trait ScopesToEntity
{
    protected function entityIncidentTypeIds(Request $request): array
    {
        return $request->user()->entity->incidentTypes()->pluck('incident_types.id')->all();
    }

    protected function authorizeForEntity(Request $request, Report $report): void
    {
        abort_unless(
            in_array($report->incident_type_id, $this->entityIncidentTypeIds($request), true),
            403,
            'Este reporte no corresponde a tu entidad.',
        );
    }
}

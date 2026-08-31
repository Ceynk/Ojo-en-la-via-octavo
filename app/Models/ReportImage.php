<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportImage extends Model
{
    protected $fillable = ['report_id', 'path', 'type', 'kind'];

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }
}

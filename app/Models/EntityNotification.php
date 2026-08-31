<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityNotification extends Model
{
    protected $fillable = [
        'report_id',
        'entity_email',
        'subject',
        'message',
        'priority',
        'status',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }
}

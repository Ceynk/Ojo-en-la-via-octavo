<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportEmbedding extends Model
{
    public $timestamps = false;

    protected $fillable = ['report_id', 'embedding', 'model'];

    protected function casts(): array
    {
        return [
            'embedding' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityNotification extends Model
{
    protected $fillable = [
        'report_id',
        'rule_id',
        'entity_email',
        'subject',
        'message',
        'priority',
        'status',
        'token',
        'token_used',
        'token_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'token_used'       => 'boolean',
            'token_expires_at' => 'datetime',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(NotificationRule::class, 'rule_id');
    }

    public function isTokenValid(): bool
    {
        return !$this->token_used
            && $this->token_expires_at !== null
            && $this->token_expires_at->isFuture();
    }
}

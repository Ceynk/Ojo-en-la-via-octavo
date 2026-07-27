<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Report extends Model
{
    protected $fillable = [
        'user_id',
        'incident_type_id',
        'description',
        'status',
        'latitude',
        'longitude',
        'address_text',
        'is_edited',
        'edited_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude'  => 'float',
            'longitude' => 'float',
            'is_edited' => 'boolean',
            'edited_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function incidentType(): BelongsTo
    {
        return $this->belongsTo(IncidentType::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ReportImage::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(ReportStatusHistory::class)->latest();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->whereNull('parent_id')->latest();
    }

    public function likes(): MorphMany
    {
        return $this->morphMany(Like::class, 'likeable');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function entityNotifications(): HasMany
    {
        return $this->hasMany(EntityNotification::class);
    }
}

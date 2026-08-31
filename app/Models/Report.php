<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
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
        'claimed_by_user_id',
        'claimed_at',
        'possible_duplicate_of',
        'duplicate_similarity',
    ];

    protected function casts(): array
    {
        return [
            'latitude'             => 'float',
            'longitude'            => 'float',
            'is_edited'            => 'boolean',
            'edited_at'            => 'datetime',
            'claimed_at'           => 'datetime',
            'duplicate_similarity' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function claimedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'claimed_by_user_id');
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

    public function embedding(): HasOne
    {
        return $this->hasOne(ReportEmbedding::class);
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(ReportConfirmation::class);
    }

    // Named differently from the `possible_duplicate_of` column: Eloquent snake-cases
    // relation names on serialization, and `possibleDuplicateOf` would collide with
    // (and silently overwrite) the raw FK column in the JSON output.
    public function originalReport(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'possible_duplicate_of');
    }
}

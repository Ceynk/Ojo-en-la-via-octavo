<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
        'client_uuid',
        'validation_status',
        'validation_notes',
        'validated_by_user_id',
        'validated_at',
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
            'validated_at'         => 'datetime',
        ];
    }

    /** Excludes reports an admin marked as not valid (RF-14). */
    public function scopeNotRejected(Builder $query): Builder
    {
        return $query->where(fn ($q) => $q->whereNull('validation_status')->orWhere('validation_status', '!=', 'invalido'));
    }

    /** Like notRejected(), but a citizen always keeps seeing their own reports. */
    public function scopeVisibleTo(Builder $query, ?User $user): Builder
    {
        return $query->where(fn ($q) => $q->notRejected()->when($user, fn ($q) => $q->orWhere('user_id', $user->id)));
    }

    /**
     * Community support = likes + "es el mismo problema" confirmations (RF-12). Written as
     * plain subqueries (not withCount aliases) so it also sorts on PostgreSQL, which won't
     * accept arithmetic on SELECT aliases in ORDER BY.
     */
    public function scopeOrderBySupport(Builder $query): Builder
    {
        $morph = (new static)->getMorphClass();

        return $query->orderByRaw(
            '((select count(*) from likes where likes.likeable_id = reports.id and likes.likeable_type = ?)'
            .' + (select count(*) from report_confirmations where report_confirmations.report_id = reports.id)) desc',
            [$morph],
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function claimedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'claimed_by_user_id');
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by_user_id');
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

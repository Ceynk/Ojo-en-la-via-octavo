<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'entity_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'document_type',
        'document_number',
        'address',
        'neighborhood',
        'birth_date',
        'gender',
        'password',
        'role',
        'is_active',
        'profile_photo',
        'notify_by_email',
        'last_login_at',
        'current_latitude',
        'current_longitude',
        'location_updated_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['name'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'birth_date'        => 'date:Y-m-d',
            'password'          => 'hashed',
            'is_active'         => 'boolean',
            'notify_by_email'   => 'boolean',
            'last_login_at'     => 'datetime',
            'current_latitude'  => 'float',
            'current_longitude' => 'float',
            'location_updated_at' => 'datetime',
        ];
    }

    /** Full name, computed from first_name + last_name for display everywhere. */
    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn () => trim("{$this->first_name} {$this->last_name}"),
        );
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isEntityUser(): bool
    {
        return $this->entity_id !== null;
    }

    public function isOperator(): bool
    {
        return $this->role === 'operator';
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(Entity::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    public function claimedReports(): HasMany
    {
        return $this->hasMany(Report::class, 'claimed_by_user_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(Like::class);
    }
}

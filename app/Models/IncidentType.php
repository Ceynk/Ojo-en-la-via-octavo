<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentType extends Model
{
    protected $fillable = ['name'];

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }
}

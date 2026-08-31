<?php

namespace App\Jobs;

use App\Mail\IncidentResolvedMail;
use App\Models\Report;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class NotifyAllCitizensOfResolution implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Report $report) {}

    public function handle(): void
    {
        User::where('role', 'ciudadano')
            ->where('is_active', true)
            ->chunkById(200, function ($citizens) {
                foreach ($citizens as $citizen) {
                    Mail::to($citizen->email)->queue(new IncidentResolvedMail($this->report));
                }
            });
    }
}

<?php

namespace App\Events;

use App\Models\Report;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class ReportCreated implements ShouldBroadcastNow
{
    use SerializesModels;

    public function __construct(public Report $report) {}

    public function broadcastOn(): Channel
    {
        return new Channel('reports');
    }

    public function broadcastAs(): string
    {
        return 'report.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id'            => $this->report->id,
            'description'   => $this->report->description,
            'status'        => $this->report->status,
            'latitude'      => $this->report->latitude,
            'longitude'     => $this->report->longitude,
            'address_text'  => $this->report->address_text,
            'incident_type' => $this->report->incidentType?->only('id', 'name'),
            'user'          => ['name' => $this->report->user?->name],
            'created_at'    => $this->report->created_at?->toIso8601String(),
            'images'        => [],
            'likes_count'   => 0,
            'comments_count'=> 0,
            'user_liked'    => false,
        ];
    }
}

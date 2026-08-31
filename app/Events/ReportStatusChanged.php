<?php

namespace App\Events;

use App\Models\Report;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class ReportStatusChanged implements ShouldBroadcastNow
{
    use SerializesModels;

    public function __construct(
        public Report $report,
        public string $previousStatus,
    ) {}

    /** @return Channel[] */
    public function broadcastOn(): array
    {
        $channels = [new Channel('reports')];

        if ($this->report->user_id) {
            $channels[] = new PrivateChannel("user.{$this->report->user_id}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'report.status.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'id'              => $this->report->id,
            'status'          => $this->report->status,
            'previous_status' => $this->previousStatus,
            'description'     => $this->report->description,
        ];
    }
}

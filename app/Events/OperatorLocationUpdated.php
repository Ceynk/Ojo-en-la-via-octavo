<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class OperatorLocationUpdated implements ShouldBroadcastNow
{
    use SerializesModels;

    public function __construct(public User $operator) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("entity.{$this->operator->entity_id}.operators");
    }

    public function broadcastAs(): string
    {
        return 'operator.location.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'operator_id'   => $this->operator->id,
            'name'          => $this->operator->name,
            'latitude'      => $this->operator->current_latitude,
            'longitude'     => $this->operator->current_longitude,
            'updated_at'    => $this->operator->location_updated_at?->toISOString(),
        ];
    }
}

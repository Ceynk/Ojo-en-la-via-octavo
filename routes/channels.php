<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('entity.{entityId}.operators', function ($user, $entityId) {
    return $user->entity_id !== null && (int) $user->entity_id === (int) $entityId;
});

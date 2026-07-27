<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->with(['actor:id,name,profile_photo', 'report:id,description,status'])
            ->latest()
            ->paginate(20);

        return response()->json($notifications);
    }

    public function markRead(Notification $notification): JsonResponse
    {
        $this->authorize('update', $notification);

        $notification->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()
            ->notifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function sendMass(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['exists:users,id'],
            'title'    => ['required', 'string', 'max:200'],
            'message'  => ['required', 'string', 'max:1000'],
        ]);

        foreach ($data['user_ids'] as $userId) {
            $this->notifications->create(
                userId: $userId,
                actorId: $request->user()->id,
                type: 'admin_mensaje',
                title: $data['title'],
                message: $data['message'],
            );
        }

        return back()->with('success', count($data['user_ids']) . ' notificaciones enviadas.');
    }

    public function adminIndex(Request $request): \Inertia\Response
    {
        return Inertia::render('Admin/Notifications/Index', [
            'users' => User::where('is_active', true)
                ->select('id', 'name', 'email')
                ->orderBy('name')
                ->get(),
        ]);
    }
}

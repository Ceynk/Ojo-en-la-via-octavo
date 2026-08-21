<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Entity;
use App\Models\Report;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CommentController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    public function index(Report $report): JsonResponse
    {
        $comments = $report->comments()
            ->with([
                'user:id,first_name,last_name,profile_photo,role,entity_id',
                'user.entity:id,name',
                'likes',
                'replies.user:id,first_name,last_name,profile_photo,role,entity_id',
                'replies.user.entity:id,name',
                'replies.likes',
            ])
            ->withCount('likes')
            ->where('is_deleted', false)
            ->get()
            // Admin and entity comments carry priority/authority context, so they surface
            // first regardless of when they were posted.
            ->sortBy(fn ($c) => in_array($c->user?->role, ['admin', 'entity'], true) ? 0 : 1)
            ->values()
            ->map(fn ($c) => $this->formatComment($c, auth()->id()));

        return response()->json([
            'comments' => $comments,
            'total'    => $report->comments()->where('is_deleted', false)->count(),
        ]);
    }

    public function store(Request $request, Report $report): JsonResponse
    {
        $data = $request->validate([
            'body'      => ['required', 'string', 'max:500'],
            'parent_id' => ['nullable', 'exists:comments,id'],
        ]);

        $comment = $report->comments()->create([
            ...$data,
            'user_id' => $request->user()->id,
        ]);

        $comment->load(['user:id,first_name,last_name,profile_photo,role,entity_id', 'user.entity:id,name']);

        // Notify report owner
        if ($report->user_id !== $request->user()->id) {
            $this->notifications->create(
                userId: $report->user_id,
                actorId: $request->user()->id,
                type: 'comentario',
                title: 'Nuevo comentario',
                message: $request->user()->name . ' comentó en tu reporte: "' . \Str::limit($data['body'], 80) . '"',
                reportId: $report->id,
                commentId: $comment->id,
            );
        }

        // Notify parent comment author
        if ($data['parent_id'] ?? null) {
            $parent = Comment::find($data['parent_id']);
            if ($parent && $parent->user_id !== $request->user()->id) {
                $this->notifications->create(
                    userId: $parent->user_id,
                    actorId: $request->user()->id,
                    type: 'respuesta_comentario',
                    title: 'Nueva respuesta',
                    message: $request->user()->name . ' respondió tu comentario: "' . \Str::limit($data['body'], 80) . '"',
                    reportId: $report->id,
                    commentId: $comment->id,
                );
            }
        }

        // Notify entities that handle this report's incident type
        $entities = Entity::active()->forIncidentType($report->incident_type_id)->get();
        foreach ($entities as $entity) {
            $this->notifications->notifyEntityNewComment($entity, $report, $comment, $request->user()->id);
        }

        return response()->json(['ok' => true, 'comment' => $comment]);
    }

    public function update(Request $request, Comment $comment): JsonResponse
    {
        Gate::authorize('update', $comment);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:500'],
        ]);

        $comment->update([
            'body'      => $data['body'],
            'is_edited' => true,
            'edited_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function destroy(Comment $comment): JsonResponse
    {
        Gate::authorize('delete', $comment);

        // Soft-delete all replies recursively
        Comment::where('parent_id', $comment->id)->update(['is_deleted' => true]);
        $comment->update(['is_deleted' => true]);

        return response()->json(['ok' => true]);
    }

    private function formatComment(Comment $comment, ?int $userId): array
    {
        return [
            'id'         => $comment->id,
            'body'       => $comment->is_deleted ? null : $comment->body,
            'is_deleted' => $comment->is_deleted,
            'is_edited'  => $comment->is_edited,
            'user'       => $comment->user,
            'likes_count'=> $comment->likes_count ?? $comment->likes->count(),
            'user_liked' => $userId ? $comment->likes->contains('user_id', $userId) : false,
            'created_at' => $comment->created_at,
            'replies'    => $comment->replies
                ->where('is_deleted', false)
                ->map(fn ($r) => $this->formatComment($r, $userId))
                ->values(),
        ];
    }
}

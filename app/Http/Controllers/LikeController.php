<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Report;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LikeController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    public function toggleReport(Request $request, Report $report): JsonResponse
    {
        $user = $request->user();
        $like = $report->likes()->where('user_id', $user->id)->first();

        if ($like) {
            $like->delete();
            $liked = false;
        } else {
            $report->likes()->create(['user_id' => $user->id]);
            $liked = true;

            if ($report->user_id !== $user->id) {
                $this->notifications->create(
                    userId: $report->user_id,
                    actorId: $user->id,
                    type: 'like_reporte',
                    title: 'Le gustó tu reporte',
                    message: $user->name . ' marcó como útil tu reporte.',
                    reportId: $report->id,
                );
            }
        }

        return response()->json([
            'liked'       => $liked,
            'likes_count' => $report->likes()->count(),
        ]);
    }

    public function toggleComment(Request $request, Comment $comment): JsonResponse
    {
        $user = $request->user();
        $like = $comment->likes()->where('user_id', $user->id)->first();

        if ($like) {
            $like->delete();
            $liked = false;
        } else {
            $comment->likes()->create(['user_id' => $user->id]);
            $liked = true;

            if ($comment->user_id !== $user->id) {
                $this->notifications->create(
                    userId: $comment->user_id,
                    actorId: $user->id,
                    type: 'like_comentario',
                    title: 'Le gustó tu comentario',
                    message: $user->name . ' marcó como útil tu comentario.',
                    reportId: $comment->report_id,
                    commentId: $comment->id,
                );
            }
        }

        return response()->json([
            'liked'       => $liked,
            'likes_count' => $comment->likes()->count(),
        ]);
    }
}

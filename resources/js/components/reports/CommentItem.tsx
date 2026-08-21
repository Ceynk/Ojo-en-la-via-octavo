import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Reply, Pencil, Trash2, Check, X, Loader2, ShieldCheck, Building2 } from 'lucide-react';
import axios from 'axios';
import { cn, formatRelativeTime } from '@/lib/utils';
import CommentForm from './CommentForm';
import type { Comment, User } from '@/types';

interface CommentItemProps {
    comment: Comment;
    reportId: number;
    currentUser: User | null;
    depth?: number;
    onReplyPosted: (reply: Comment, parentId: number) => void;
    onUpdated: (id: number, body: string) => void;
    onDeleted: (id: number) => void;
}

export default function CommentItem({
    comment,
    reportId,
    currentUser,
    depth = 0,
    onReplyPosted,
    onUpdated,
    onDeleted,
}: CommentItemProps) {
    const [liked, setLiked] = useState(comment.user_liked ?? false);
    const [likesCount, setLikesCount] = useState(comment.likes_count ?? 0);
    const [liking, setLiking] = useState(false);

    const [replying, setReplying] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editBody, setEditBody] = useState(comment.body ?? '');
    const [editLoading, setEditLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const isOwner = currentUser?.id === comment.user_id;
    const isAdmin = currentUser?.role === 'admin';
    const canEdit = isOwner && !comment.is_deleted;
    const canDelete = (isOwner || isAdmin) && !comment.is_deleted;

    async function toggleLike() {
        if (!currentUser || liking || comment.is_deleted) return;
        setLiking(true);
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount((c) => (wasLiked ? c - 1 : c + 1));
        try {
            await axios.post(`/comments/${comment.id}/like`);
        } catch {
            setLiked(wasLiked);
            setLikesCount((c) => (wasLiked ? c + 1 : c - 1));
        } finally {
            setLiking(false);
        }
    }

    async function saveEdit() {
        if (!editBody.trim() || editLoading) return;
        setEditLoading(true);
        try {
            await axios.put(`/comments/${comment.id}`, { body: editBody.trim() });
            onUpdated(comment.id, editBody.trim());
            setEditing(false);
        } finally {
            setEditLoading(false);
        }
    }

    async function confirmDelete() {
        if (deleteLoading) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`/comments/${comment.id}`);
            onDeleted(comment.id);
        } finally {
            setDeleteLoading(false);
            setDeleteConfirm(false);
        }
    }

    const isAdminComment = comment.user?.role === 'admin' && !comment.is_deleted;
    const isEntityComment = comment.user?.role === 'entity' && !comment.is_deleted;
    const isPriorityComment = isAdminComment || isEntityComment;
    const displayName = isEntityComment
        ? comment.user?.entity?.name ?? comment.user?.name
        : comment.user?.name;
    const avatarLetter = displayName?.[0]?.toUpperCase() ?? '?';

    return (
        <div className={cn('flex gap-3', depth > 0 && 'ml-8 border-l-2 border-default pl-4')}>
            {/* Avatar */}
            <div className={cn(
                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                isPriorityComment
                    ? 'bg-brand-600 text-white'
                    : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400',
            )}>
                {comment.is_deleted ? '?' : avatarLetter}
            </div>

            <div className="flex-1 min-w-0">
                {/* Header */}
                {!comment.is_deleted && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-primary">{displayName}</span>
                        {isAdminComment && (
                            <span className="flex items-center gap-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                Ojo en la Vía
                            </span>
                        )}
                        {isEntityComment && (
                            <span className="flex items-center gap-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                <Building2 className="h-2.5 w-2.5" />
                                Entidad
                            </span>
                        )}
                        <span className="text-[10px] text-muted">{formatRelativeTime(comment.created_at)}</span>
                        {comment.is_edited && (
                            <span className="text-[10px] text-muted">(editado)</span>
                        )}
                    </div>
                )}

                {/* Body */}
                {comment.is_deleted ? (
                    <p className="text-xs text-muted italic">Comentario eliminado</p>
                ) : editing ? (
                    <div className="mt-1 flex flex-col gap-1.5">
                        <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            maxLength={500}
                            rows={3}
                            autoFocus
                            className="w-full resize-none rounded-lg border border-default bg-surface-primary px-3 py-2 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={saveEdit}
                                disabled={!editBody.trim() || editLoading}
                                className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                            >
                                {editLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                Guardar
                            </button>
                            <button
                                onClick={() => { setEditing(false); setEditBody(comment.body ?? ''); }}
                                className="flex items-center gap-1 rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-surface-tertiary"
                            >
                                <X className="h-3 w-3" />
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="mt-0.5 text-sm text-secondary leading-relaxed whitespace-pre-wrap break-words">
                        {comment.body}
                    </p>
                )}

                {/* Actions */}
                {!comment.is_deleted && !editing && (
                    <div className="mt-1.5 flex items-center gap-3">
                        {/* Like */}
                        <button
                            onClick={toggleLike}
                            disabled={!currentUser}
                            className={cn(
                                'flex items-center gap-1 text-xs transition-colors',
                                liked ? 'text-red-500' : 'text-muted hover:text-red-400',
                                !currentUser && 'cursor-default',
                            )}
                        >
                            <Heart className={cn('h-3 w-3', liked && 'fill-current')} />
                            {likesCount > 0 && <span>{likesCount}</span>}
                        </button>

                        {/* Reply (only on root level) */}
                        {depth === 0 && currentUser && (
                            <button
                                onClick={() => setReplying((r) => !r)}
                                className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-brand-600"
                            >
                                <Reply className="h-3 w-3" />
                                Responder
                            </button>
                        )}

                        {/* Edit */}
                        {canEdit && (
                            <button
                                onClick={() => { setEditing(true); setEditBody(comment.body ?? ''); }}
                                className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-primary"
                            >
                                <Pencil className="h-3 w-3" />
                                Editar
                            </button>
                        )}

                        {/* Delete */}
                        {canDelete && !deleteConfirm && (
                            <button
                                onClick={() => setDeleteConfirm(true)}
                                className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-red-500"
                            >
                                <Trash2 className="h-3 w-3" />
                                Eliminar
                            </button>
                        )}

                        {/* Delete confirm */}
                        {deleteConfirm && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-red-500">¿Eliminar?</span>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleteLoading}
                                    className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                                >
                                    {deleteLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sí'}
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(false)}
                                    className="text-xs text-muted hover:text-primary"
                                >
                                    No
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Reply form */}
                <AnimatePresence>
                    {replying && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 overflow-hidden"
                        >
                            <CommentForm
                                reportId={reportId}
                                parentId={comment.id}
                                placeholder={`Responder a ${comment.user?.name ?? 'este comentario'}…`}
                                autoFocus
                                onSuccess={(reply) => {
                                    onReplyPosted(reply, comment.id);
                                    setReplying(false);
                                }}
                                onCancel={() => setReplying(false)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Replies */}
                {(comment.replies?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-col gap-4">
                        {comment.replies!.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                reportId={reportId}
                                currentUser={currentUser}
                                depth={depth + 1}
                                onReplyPosted={onReplyPosted}
                                onUpdated={onUpdated}
                                onDeleted={onDeleted}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

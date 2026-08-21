import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePage } from '@inertiajs/react';
import {
    X, Heart, MessageSquare, MapPin, Calendar, Pencil,
    ChevronLeft, ChevronRight, Loader2, AlertTriangle, Maximize2,
} from 'lucide-react';
import axios from 'axios';
import { cn, formatRelativeTime, getStorageUrl, sortCommentsByPriority, STATUS_LABELS } from '@/lib/utils';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import StatusBadge from './StatusBadge';
import StatusTimeline from './StatusTimeline';
import MediaLightbox from './MediaLightbox';
import type { Comment, Report, ReportStatus, PageProps, ReportImage } from '@/types';

interface ReportDrawerProps {
    reportId: number | null;
    onClose: () => void;
    /** Entity/operator views read "notificado" as confusing ("notified to whom?") — let callers swap the whole label set (used for both the header badge and the status timeline steps). */
    statusLabels?: Record<ReportStatus, string>;
}

interface CommentsResponse {
    comments: Comment[];
    total: number;
}

export default function ReportDrawer({ reportId, onClose, statusLabels }: ReportDrawerProps) {
    const { auth } = usePage<PageProps>().props;
    const queryClient = useQueryClient();

    const { data: report, isLoading: loadingReport } = useQuery<Report>({
        queryKey: ['report', reportId],
        queryFn: () => axios.get<Report>(`/reports/${reportId}`).then((r) => r.data),
        enabled: reportId !== null,
        staleTime: 30_000,
    });

    const { data: commentsData, isLoading: loadingComments } = useQuery<CommentsResponse>({
        queryKey: ['comments', reportId],
        queryFn: () =>
            axios.get<CommentsResponse>(`/reports/${reportId}/comments`).then((r) => r.data),
        enabled: reportId !== null,
        staleTime: 0,
    });

    const [comments, setComments] = useState<Comment[]>([]);
    const [imageIndex, setImageIndex] = useState(0);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [liking, setLiking] = useState(false);
    const [lightbox, setLightbox] = useState<ReportImage | null>(null);

    // Reset when report changes
    useEffect(() => {
        setImageIndex(0);
        setLiked(report?.user_liked ?? false);
        setLikesCount(report?.likes_count ?? 0);
        setLightbox(null);
    }, [report?.id]);

    // Sync comments
    useEffect(() => {
        if (commentsData) setComments(sortCommentsByPriority(commentsData.comments));
    }, [commentsData]);

    async function toggleReportLike() {
        if (!auth.user || liking || !reportId) return;
        setLiking(true);
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount((c) => (wasLiked ? c - 1 : c + 1));
        try {
            await axios.post(`/reports/${reportId}/like`);
            queryClient.invalidateQueries({ queryKey: ['reports'] });
        } catch {
            setLiked(wasLiked);
            setLikesCount((c) => (wasLiked ? c + 1 : c - 1));
        } finally {
            setLiking(false);
        }
    }

    const handleCommentPosted = useCallback((comment: Comment) => {
        setComments((prev) => sortCommentsByPriority([comment, ...prev]));
    }, []);

    const handleReplyPosted = useCallback((reply: Comment, parentId: number) => {
        setComments((prev) =>
            prev.map((c) =>
                c.id === parentId
                    ? { ...c, replies: [...(c.replies ?? []), reply] }
                    : c,
            ),
        );
    }, []);

    const handleCommentUpdated = useCallback((id: number, body: string) => {
        setComments((prev) =>
            prev.map((c) => {
                if (c.id === id) return { ...c, body, is_edited: true };
                return {
                    ...c,
                    replies: c.replies?.map((r) =>
                        r.id === id ? { ...r, body, is_edited: true } : r,
                    ),
                };
            }),
        );
    }, []);

    const handleCommentDeleted = useCallback((id: number) => {
        setComments((prev) =>
            prev.map((c) => {
                if (c.id === id) return { ...c, is_deleted: true, body: null };
                return {
                    ...c,
                    replies: c.replies?.map((r) =>
                        r.id === id ? { ...r, is_deleted: true, body: null } : r,
                    ),
                };
            }),
        );
    }, []);

    const images = report?.images ?? [];

    return (
        <>
        <AnimatePresence>
            {reportId !== null && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm"
                    />

                    {/* Drawer panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                        className="fixed right-0 top-0 z-[1200] flex h-full w-full max-w-lg flex-col bg-surface-primary shadow-[var(--shadow-modal)]"
                    >
                        {/* Header */}
                        <div className="flex shrink-0 items-center justify-between border-b border-default px-5 py-4">
                            <div className="flex items-center gap-3">
                                {report && <StatusBadge status={report.status} labelOverride={(statusLabels ?? STATUS_LABELS)[report.status]} />}
                                <span className="text-sm font-semibold text-primary">
                                    {report?.incident_type?.name ?? 'Reporte'}
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto">
                            {loadingReport ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                                </div>
                            ) : !report ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <AlertTriangle className="mb-2 h-8 w-8 text-muted" />
                                    <p className="text-sm text-muted">No se pudo cargar el reporte</p>
                                </div>
                            ) : (
                                <>
                                    {/* Image gallery */}
                                    {images.length > 0 && (
                                        <div className="relative aspect-video w-full bg-surface-tertiary shrink-0">
                                            {images[imageIndex].type === 'video' ? (
                                                <>
                                                    <video
                                                        key={images[imageIndex].id}
                                                        src={getStorageUrl(images[imageIndex].path)}
                                                        controls
                                                        className="h-full w-full bg-black object-contain"
                                                    />
                                                    <button
                                                        onClick={() => setLightbox(images[imageIndex])}
                                                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                                                        title="Ver en grande"
                                                    >
                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setLightbox(images[imageIndex])}
                                                    className="block h-full w-full cursor-pointer"
                                                >
                                                    <img
                                                        src={getStorageUrl(images[imageIndex].path)}
                                                        alt={`Foto ${imageIndex + 1}`}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </button>
                                            )}
                                            {images.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={() => setImageIndex((i) => Math.max(0, i - 1))}
                                                        disabled={imageIndex === 0}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setImageIndex((i) => Math.min(images.length - 1, i + 1))}
                                                        disabled={imageIndex === images.length - 1}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30"
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </button>
                                                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                                                        {images.map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={cn(
                                                                    'h-1.5 rounded-full transition-all',
                                                                    i === imageIndex
                                                                        ? 'w-4 bg-white'
                                                                        : 'w-1.5 bg-white/50',
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Report details */}
                                    <div className="space-y-4 p-5">
                                        <p className="text-sm leading-relaxed text-secondary whitespace-pre-wrap">
                                            {report.description}
                                        </p>

                                        {report.address_text && (
                                            <div className="flex items-start gap-2 text-xs text-muted">
                                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                <span>{report.address_text}</span>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                                    {report.user?.name?.[0]?.toUpperCase()}
                                                </div>
                                                <span>{report.user?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{formatRelativeTime(report.created_at)}</span>
                                            </div>
                                            {report.is_edited && (
                                                <div className="flex items-center gap-1">
                                                    <Pencil className="h-3 w-3" />
                                                    <span>editado</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Like bar */}
                                        <div className="flex items-center gap-4 border-t border-default pt-4">
                                            <button
                                                onClick={toggleReportLike}
                                                disabled={!auth.user}
                                                className={cn(
                                                    'flex items-center gap-1.5 text-sm font-medium transition-colors',
                                                    liked
                                                        ? 'text-red-500'
                                                        : 'text-muted hover:text-red-400',
                                                    !auth.user && 'cursor-default',
                                                )}
                                            >
                                                <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
                                                {likesCount > 0 ? `${likesCount} me gusta` : 'Me gusta'}
                                            </button>

                                            <span className="flex items-center gap-1.5 text-sm text-muted">
                                                <MessageSquare className="h-4 w-4" />
                                                {commentsData?.total ?? comments.length} comentarios
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status timeline */}
                                    <div className="border-t border-default px-5 py-5">
                                        <h3 className="mb-4 text-sm font-semibold text-primary">
                                            Historial del reporte
                                        </h3>
                                        <StatusTimeline report={report} labels={statusLabels} />
                                    </div>

                                    {/* Comments */}
                                    <div className="border-t border-default px-5 py-5">
                                        <h3 className="mb-4 text-sm font-semibold text-primary">
                                            Comentarios
                                        </h3>

                                        {auth.user ? (
                                            <div className="mb-6">
                                                <CommentForm
                                                    reportId={report.id}
                                                    onSuccess={handleCommentPosted}
                                                    placeholder="Agrega un comentario…"
                                                />
                                            </div>
                                        ) : (
                                            <p className="mb-4 text-xs text-muted">
                                                Inicia sesión para comentar.
                                            </p>
                                        )}

                                        {loadingComments ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted" />
                                            </div>
                                        ) : comments.length === 0 ? (
                                            <div className="flex flex-col items-center py-8 text-center">
                                                <MessageSquare className="mb-2 h-8 w-8 text-muted opacity-40" />
                                                <p className="text-sm text-muted">Sin comentarios aún</p>
                                                <p className="text-xs text-muted">¡Sé el primero en comentar!</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-5">
                                                {comments.map((comment) => (
                                                    <CommentItem
                                                        key={comment.id}
                                                        comment={comment}
                                                        reportId={report.id}
                                                        currentUser={auth.user}
                                                        onReplyPosted={handleReplyPosted}
                                                        onUpdated={handleCommentUpdated}
                                                        onDeleted={handleCommentDeleted}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        <MediaLightbox media={lightbox} onClose={() => setLightbox(null)} />
        </>
    );
}

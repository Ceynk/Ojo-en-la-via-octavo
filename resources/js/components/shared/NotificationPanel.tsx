import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from '@inertiajs/react';
import {
    Bell, MessageSquare, Heart, RefreshCw, Reply, CheckCheck,
    X, Loader2, BellOff, FileText,
} from 'lucide-react';
import axios from 'axios';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Notification, NotificationType, PaginatedData } from '@/types';

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
    comentario: MessageSquare,
    respuesta_comentario: Reply,
    like_reporte: Heart,
    like_comentario: Heart,
    estado_reporte: RefreshCw,
    admin_mensaje: Bell,
    nuevo_reporte_entidad: FileText,
    comentario_entidad: MessageSquare,
};

const TYPE_COLOR: Record<NotificationType, string> = {
    comentario: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400',
    respuesta_comentario: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400',
    like_reporte: 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
    like_comentario: 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
    estado_reporte: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    admin_mensaje: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    nuevo_reporte_entidad: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    comentario_entidad: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400',
};

interface NotificationPanelProps {
    open: boolean;
    onClose: () => void;
    onReportOpen?: (reportId: number) => void;
}

export default function NotificationPanel({ open, onClose, onReportOpen }: NotificationPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const [markingAll, setMarkingAll] = useState(false);
    const [readIds, setReadIds] = useState<Set<number>>(new Set());

    const { data, isLoading } = useQuery<PaginatedData<Notification>>({
        queryKey: ['notifications'],
        queryFn: () =>
            axios.get<PaginatedData<Notification>>('/notifications').then((r) => r.data),
        enabled: open,
        staleTime: 0,
    });

    const notifications = data?.data ?? [];

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open, onClose]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    async function markRead(notification: Notification) {
        if (notification.read_at || readIds.has(notification.id)) return;
        setReadIds((s) => new Set([...s, notification.id]));
        try {
            await axios.post(`/notifications/${notification.id}/read`);
            router.reload({ only: ['notifications_count'] });
        } catch {
            setReadIds((s) => { const n = new Set(s); n.delete(notification.id); return n; });
        }
    }

    async function markAllRead() {
        if (markingAll) return;
        setMarkingAll(true);
        try {
            await axios.post('/notifications/read-all');
            setReadIds(new Set(notifications.map((n) => n.id)));
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            router.reload({ only: ['notifications_count'] });
        } finally {
            setMarkingAll(false);
        }
    }

    function handleNotificationClick(notification: Notification) {
        markRead(notification);
        if (notification.report_id && onReportOpen) {
            onReportOpen(notification.report_id);
            onClose();
        }
    }

    const unreadCount = notifications.filter(
        (n) => !n.read_at && !readIds.has(n.id),
    ).length;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    ref={panelRef}
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={cn(
                        'absolute right-0 top-full z-50 mt-2 w-80 sm:w-96',
                        'rounded-xl border border-white/10 bg-slate-900/95 text-white shadow-[var(--shadow-modal)] backdrop-blur-md',
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">Notificaciones</span>
                            {unreadCount > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    disabled={markingAll}
                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                                    title="Marcar todas como leídas"
                                >
                                    {markingAll ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <CheckCheck className="h-3.5 w-3.5" />
                                    )}
                                    Leer todas
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-center">
                                <BellOff className="mb-2 h-8 w-8 text-white/40" />
                                <p className="text-sm text-white/50">Sin notificaciones</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/10">
                                {notifications.map((notification) => {
                                    const Icon = TYPE_ICON[notification.type] ?? Bell;
                                    const isRead = !!(notification.read_at || readIds.has(notification.id));
                                    const isClickable = !!notification.report_id;

                                    return (
                                        <li key={notification.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleNotificationClick(notification)}
                                                className={cn(
                                                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                                                    isRead ? 'hover:bg-white/5' : 'bg-brand-500/10 hover:bg-brand-500/15',
                                                    !isClickable && 'cursor-default',
                                                )}
                                            >
                                                {/* Icon */}
                                                <div
                                                    className={cn(
                                                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                                        TYPE_COLOR[notification.type],
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className={cn(
                                                            'text-xs leading-relaxed',
                                                            isRead ? 'text-white/60' : 'font-medium text-white',
                                                        )}
                                                    >
                                                        <span className="font-semibold">{notification.title}: </span>
                                                        {notification.message}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] text-white/40">
                                                        {formatRelativeTime(notification.created_at)}
                                                    </p>
                                                </div>

                                                {/* Unread dot */}
                                                {!isRead && (
                                                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    {(data?.last_page ?? 1) > 1 && (
                        <div className="border-t border-white/10 px-4 py-2">
                            <p className="text-center text-xs text-white/40">
                                Mostrando las 20 más recientes
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

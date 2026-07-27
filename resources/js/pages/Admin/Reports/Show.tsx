import { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, MapPin, User, Clock, Heart, MessageSquare,
    Image as ImageIcon, ChevronLeft, ChevronRight, CheckCircle2,
    RefreshCw, Mail,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import StatusBadge from '@/components/reports/StatusBadge';
import { FlashMessages } from '@/components/ui/alert';
import { cn, formatDateTime, formatRelativeTime, getStorageUrl, STATUS_LABELS } from '@/lib/utils';
import type {
    PageProps, Report, ReportStatus, ReportStatusHistory, EntityNotification,
} from '@/types';

interface ShowProps extends PageProps {
    report: Report & {
        status_history: ReportStatusHistory[];
        entity_notifications: EntityNotification[];
    };
}

const STATUS_OPTIONS: ReportStatus[] = ['pendiente', 'en_revision', 'notificado', 'resuelto'];

const STATUS_COLORS: Record<ReportStatus, string> = {
    pendiente: 'text-amber-600',
    en_revision: 'text-blue-600',
    notificado: 'text-violet-600',
    resuelto: 'text-emerald-600',
};

const STATUS_BG: Record<ReportStatus, string> = {
    pendiente: 'bg-amber-500',
    en_revision: 'bg-blue-500',
    notificado: 'bg-violet-500',
    resuelto: 'bg-emerald-500',
};

export default function AdminReportShow() {
    const { report } = usePage<ShowProps>().props;
    const [imgIndex, setImgIndex] = useState(0);

    const { data, setData, patch, processing, errors, reset } = useForm({
        status: report.status,
        notes: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/admin/reports/${report.id}/status`, {
            onSuccess: () => reset('notes'),
        });
    }

    const images = report.images ?? [];

    return (
        <AdminLayout
            title={`Reporte #${report.id}`}
            breadcrumbs={[
                { label: 'Reportes', href: '/admin/reports' },
                { label: `#${report.id}` },
            ]}
        >
            <Head title={`Reporte #${report.id} — Admin`} />

            <div className="space-y-5">
                <FlashMessages />

                <div className="grid gap-5 lg:grid-cols-3">
                    {/* ─── Left column: details ─── */}
                    <div className="space-y-4 lg:col-span-2">

                        {/* Report card */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                        >
                            <div className="flex items-start justify-between border-b border-default px-5 py-4">
                                <div>
                                    <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-secondary">
                                        {report.incident_type?.name ?? '—'}
                                    </span>
                                    <div className="mt-2 flex items-center gap-3">
                                        <StatusBadge status={report.status} />
                                        <span className="text-xs text-muted">
                                            {formatDateTime(report.created_at)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted">
                                    <span className="flex items-center gap-1">
                                        <Heart className="h-3 w-3" /> {report.likes_count ?? 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" /> {report.comments_count ?? 0}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 p-5">
                                {/* Description */}
                                <p className="text-sm leading-relaxed text-primary">{report.description}</p>

                                {/* Location */}
                                {report.address_text && (
                                    <div className="flex items-start gap-2 text-sm text-secondary">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                                        <span>{report.address_text}</span>
                                    </div>
                                )}

                                {/* Reporter */}
                                <div className="flex items-center gap-2 text-sm text-secondary">
                                    <User className="h-4 w-4 shrink-0 text-muted" />
                                    <span>
                                        {report.user?.name ?? '—'}
                                        <span className="ml-1 text-xs text-muted">({report.user?.email})</span>
                                    </span>
                                </div>

                                {report.is_edited && (
                                    <p className="text-xs text-muted italic">
                                        Editado {report.edited_at ? formatRelativeTime(report.edited_at) : ''}
                                    </p>
                                )}
                            </div>

                            {/* Image gallery */}
                            {images.length > 0 && (
                                <div className="border-t border-default p-5">
                                    <div className="relative overflow-hidden rounded-lg bg-surface-tertiary">
                                        <img
                                            src={getStorageUrl(images[imgIndex].path)}
                                            alt={`Foto ${imgIndex + 1}`}
                                            className="mx-auto max-h-72 w-full object-contain"
                                        />
                                        {images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                                                    {images.map((_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setImgIndex(i)}
                                                            className={cn(
                                                                'h-1.5 rounded-full transition-all',
                                                                i === imgIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50',
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <p className="mt-2 text-center text-xs text-muted">
                                        <ImageIcon className="inline h-3 w-3 mr-1" />
                                        {images.length} foto{images.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            )}
                        </motion.div>

                        {/* Entity notifications */}
                        {report.entity_notifications?.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                            >
                                <div className="border-b border-default px-5 py-4">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                                        <Mail className="h-4 w-4 text-muted" />
                                        Notificaciones a entidades
                                    </h3>
                                </div>
                                <div className="divide-y divide-default">
                                    {report.entity_notifications.map((n) => (
                                        <div key={n.id} className="flex items-center justify-between px-5 py-3">
                                            <div>
                                                <p className="text-sm text-primary">{n.entity_email}</p>
                                                <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
                                            </div>
                                            <span className={cn(
                                                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                                n.token_used
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-surface-tertiary text-muted',
                                            )}>
                                                {n.token_used ? 'Visto' : 'Pendiente'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* ─── Right column: status + history ─── */}
                    <div className="space-y-4">

                        {/* Change status form */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                        >
                            <div className="border-b border-default px-5 py-4">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                                    <RefreshCw className="h-4 w-4 text-muted" />
                                    Cambiar estado
                                </h3>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4 p-5">
                                <div className="grid grid-cols-2 gap-2">
                                    {STATUS_OPTIONS.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setData('status', s)}
                                            className={cn(
                                                'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                                                data.status === s
                                                    ? `border-current ${STATUS_COLORS[s]} bg-surface-secondary ring-1 ring-current/20`
                                                    : 'border-default text-secondary hover:bg-surface-secondary',
                                            )}
                                        >
                                            <span className={cn(
                                                'h-2 w-2 rounded-full',
                                                data.status === s ? STATUS_BG[s] : 'bg-surface-tertiary',
                                            )} />
                                            {STATUS_LABELS[s]}
                                        </button>
                                    ))}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-secondary">
                                        Notas internas <span className="text-muted">(opcional)</span>
                                    </label>
                                    <textarea
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={3}
                                        maxLength={500}
                                        placeholder="Agrega contexto sobre este cambio de estado…"
                                        className="w-full resize-none rounded-lg border border-default bg-surface-secondary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                                    />
                                    {errors.notes && (
                                        <p className="mt-1 text-xs text-red-600">{errors.notes}</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing || data.status === report.status}
                                    className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processing ? 'Guardando…' : 'Actualizar estado'}
                                </button>
                                {errors.status && (
                                    <p className="text-xs text-red-600">{errors.status}</p>
                                )}
                            </form>
                        </motion.div>

                        {/* Status history timeline */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 }}
                            className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                        >
                            <div className="border-b border-default px-5 py-4">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                                    <Clock className="h-4 w-4 text-muted" />
                                    Historial de estado
                                </h3>
                            </div>

                            <div className="p-5">
                                {report.status_history?.length > 0 ? (
                                    <ol className="relative space-y-4 border-l border-default pl-5">
                                        {[...report.status_history].reverse().map((h, i) => (
                                            <li key={h.id} className="relative">
                                                {/* dot */}
                                                <span className={cn(
                                                    'absolute -left-[21px] flex h-3 w-3 items-center justify-center rounded-full border-2 border-surface-primary',
                                                    i === 0 ? STATUS_BG[h.new_status as ReportStatus] : 'bg-surface-tertiary',
                                                )} />

                                                <div>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                        <span className={cn(
                                                            'text-xs font-semibold',
                                                            i === 0 ? STATUS_COLORS[h.new_status as ReportStatus] : 'text-secondary',
                                                        )}>
                                                            {STATUS_LABELS[h.new_status as ReportStatus]}
                                                        </span>
                                                        <span className="text-[10px] text-muted">
                                                            ← {STATUS_LABELS[h.previous_status as ReportStatus]}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-[10px] text-muted">
                                                        {h.changed_by?.name ?? 'Sistema'} · {formatRelativeTime(h.created_at)}
                                                    </p>
                                                    {h.notes && (
                                                        <p className="mt-1 rounded bg-surface-tertiary px-2 py-1 text-xs text-secondary">
                                                            {h.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                                        <CheckCircle2 className="h-8 w-8 text-muted/40" />
                                        <p className="text-xs text-muted">Sin cambios de estado aún</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

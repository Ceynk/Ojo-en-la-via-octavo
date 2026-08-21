import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Filter, Trash2, Eye, ChevronLeft, ChevronRight,
    Heart, MessageSquare, Loader2, Copy,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import StatusBadge from '@/components/reports/StatusBadge';
import { FlashMessages } from '@/components/ui/alert';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import type { PageProps, PaginatedData, Report, ReportStatus, IncidentType } from '@/types';

interface ReportsProps extends PageProps {
    reports: PaginatedData<Report>;
    filters: { status?: string; type?: string };
}

const STATUS_OPTIONS: { value: ReportStatus | ''; label: string }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'notificado', label: 'Notificado' },
    { value: 'en_camino', label: 'En camino' },
    { value: 'en_revision', label: 'En revisión' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'resuelto', label: 'Resuelto' },
];

export default function AdminReportsIndex() {
    const { reports, filters, incident_types } = usePage<ReportsProps>().props;
    const [status, setStatus] = useState(filters.status ?? '');
    const [type, setType] = useState(filters.type ?? '');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    function applyFilters(overrides?: { status?: string; type?: string }) {
        const merged = { status, type, ...overrides };
        const params: Record<string, string> = {};
        if (merged.status) params.status = merged.status;
        if (merged.type) params.type = merged.type;
        router.get('/admin/reports', params, { preserveState: true, replace: true });
    }

    function handleDelete(id: number) {
        if (deletingId) return;
        setDeletingId(id);
        router.delete(`/admin/reports/${id}`, {
            onFinish: () => {
                setDeletingId(null);
                setConfirmId(null);
            },
        });
    }

    const { data: reportList, current_page, last_page, links } = reports;
    const hasFilters = !!filters.status || !!filters.type;

    return (
        <AdminLayout
            title="Reportes"
            breadcrumbs={[{ label: 'Reportes' }]}
        >
            <Head title="Reportes — Admin" />

            <div className="space-y-4">
                <FlashMessages />

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted" />
                        <span className="text-sm text-secondary">Filtros:</span>
                    </div>

                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            applyFilters({ status: e.target.value });
                        }}
                        className="rounded-lg border border-default bg-surface-primary py-2 pl-3 pr-8 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} className="bg-white text-gray-900">{o.label}</option>
                        ))}
                    </select>

                    <select
                        value={type}
                        onChange={(e) => {
                            setType(e.target.value);
                            applyFilters({ type: e.target.value });
                        }}
                        className="rounded-lg border border-default bg-surface-primary py-2 pl-3 pr-8 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    >
                        <option value="" className="bg-white text-gray-900">Todos los tipos</option>
                        {incident_types.map((t: IncidentType) => (
                            <option key={t.id} value={t.id} className="bg-white text-gray-900">{t.name}</option>
                        ))}
                    </select>

                    {hasFilters && (
                        <button
                            onClick={() => {
                                setStatus('');
                                setType('');
                                router.get('/admin/reports', {}, { replace: true });
                            }}
                            className="rounded-lg border border-default px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface-tertiary"
                        >
                            Limpiar
                        </button>
                    )}

                    <span className="ml-auto text-xs text-muted">
                        {reports.total.toLocaleString('es-CO')} reportes
                    </span>
                </div>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)] overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-default bg-surface-secondary text-left text-xs text-muted">
                                    <th className="px-5 py-3 font-medium">Tipo</th>
                                    <th className="px-5 py-3 font-medium">Descripción</th>
                                    <th className="px-5 py-3 font-medium">Usuario</th>
                                    <th className="px-5 py-3 font-medium">Estado</th>
                                    <th className="px-5 py-3 font-medium">Fecha</th>
                                    <th className="px-5 py-3 font-medium text-center">
                                        <Heart className="inline h-3 w-3" />
                                    </th>
                                    <th className="px-5 py-3 font-medium text-center">
                                        <MessageSquare className="inline h-3 w-3" />
                                    </th>
                                    <th className="px-5 py-3 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-default">
                                {reportList.map((report) => (
                                    <tr key={report.id} className="group transition-colors hover:bg-surface-secondary">
                                        <td className="whitespace-nowrap px-5 py-3">
                                            <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-secondary">
                                                {report.incident_type?.name ?? '—'}
                                            </span>
                                        </td>

                                        <td className="max-w-[260px] px-5 py-3 text-secondary">
                                            <div className="flex flex-col gap-1">
                                                <span>{truncate(report.description, 70)}</span>
                                                {report.possible_duplicate_of !== null && (
                                                    <Link
                                                        href={`/admin/reports/${report.possible_duplicate_of}`}
                                                        className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                                                    >
                                                        <Copy className="h-2.5 w-2.5" />
                                                        Posible duplicado ({Math.round((report.duplicate_similarity ?? 0) * 100)}%)
                                                        {report.original_report ? ` — ver #${report.original_report.id}` : ''}
                                                    </Link>
                                                )}
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3 text-secondary">
                                            {report.user?.name ?? '—'}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3">
                                            <StatusBadge status={report.status} />
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3 text-muted text-xs">
                                            {formatRelativeTime(report.created_at)}
                                        </td>

                                        <td className="px-5 py-3 text-center text-muted text-xs">
                                            {report.likes_count ?? 0}
                                        </td>

                                        <td className="px-5 py-3 text-center text-muted text-xs">
                                            {report.comments_count ?? 0}
                                        </td>

                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/admin/reports/${report.id}`}
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-900/30"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Link>

                                                {confirmId === report.id ? (
                                                    <span className="flex items-center gap-1 text-xs">
                                                        <span className="text-muted">¿Eliminar?</span>
                                                        <button
                                                            onClick={() => handleDelete(report.id)}
                                                            disabled={deletingId === report.id}
                                                            className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                                        >
                                                            {deletingId === report.id ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : 'Sí'}
                                                        </button>
                                                        <span className="text-muted">/</span>
                                                        <button
                                                            onClick={() => setConfirmId(null)}
                                                            className="text-muted hover:text-secondary"
                                                        >
                                                            No
                                                        </button>
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmId(report.id)}
                                                        className={cn(
                                                            'flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors',
                                                            'hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30',
                                                        )}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {reportList.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted">
                                            No se encontraron reportes
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-default px-5 py-3">
                            <p className="text-xs text-muted">
                                {reports.from}–{reports.to} de {reports.total.toLocaleString('es-CO')}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => router.get(links[0].url ?? '')}
                                    disabled={!links[0].url}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-default text-muted transition-colors hover:bg-surface-tertiary disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="flex h-8 items-center px-2 text-xs text-muted">
                                    {current_page} / {last_page}
                                </span>
                                <button
                                    onClick={() => router.get(links[links.length - 1].url ?? '')}
                                    disabled={!links[links.length - 1].url}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-default text-muted transition-colors hover:bg-surface-tertiary disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AdminLayout>
    );
}

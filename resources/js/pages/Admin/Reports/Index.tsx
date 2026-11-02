import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Filter, Trash2, Eye, ChevronLeft, ChevronRight,
    Heart, MessageSquare, Loader2, Copy,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import UserAvatar from '@/components/shared/UserAvatar';
import StatusBadge from '@/components/reports/StatusBadge';
import { FlashMessages } from '@/components/ui/alert';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import { getIncidentTypeStyle } from '@/lib/incidentTypeStyle';
import type { PageProps, PaginatedData, Report, ReportStatus, IncidentType } from '@/types';

interface ReportsProps extends PageProps {
    reports: PaginatedData<Report>;
    filters: { status?: string; type?: string; validation?: string; sort?: string };
}

const SELECT_CLASS =
    'rounded-lg border border-default bg-surface-primary py-2 pl-3 pr-8 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors';

function ValidationBadge({ value }: { value: Report['validation_status'] }) {
    if (value === 'valido') {
        return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Validado</span>;
    }
    if (value === 'invalido') {
        return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">No válido</span>;
    }
    return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">Sin revisar</span>;
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

function IncidentTypeCell({ type }: { type: IncidentType | undefined }) {
    const { color, Icon } = getIncidentTypeStyle(type);

    return (
        <div
            className="flex min-w-[190px] items-center gap-3 rounded-xl border px-3 py-2.5"
            style={{
                borderColor: `${color}55`,
                backgroundColor: `${color}12`,
            }}
        >
            <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${color}28`, color }}
            >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Tipo de problema
                </span>
                <span className="block truncate text-sm font-bold text-primary" title={type?.name ?? 'Sin tipo'}>
                    {type?.name ?? 'Sin tipo'}
                </span>
            </div>
        </div>
    );
}

export default function AdminReportsIndex() {
    const { reports, filters, incident_types } = usePage<ReportsProps>().props;
    const [status, setStatus] = useState(filters.status ?? '');
    const [type, setType] = useState(filters.type ?? '');
    const [validation, setValidation] = useState(filters.validation ?? '');
    const [sort, setSort] = useState(filters.sort ?? '');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    function applyFilters(overrides?: { status?: string; type?: string; validation?: string; sort?: string }) {
        const merged = { status, type, validation, sort, ...overrides };
        const params: Record<string, string> = {};
        if (merged.status) params.status = merged.status;
        if (merged.type) params.type = merged.type;
        if (merged.validation) params.validation = merged.validation;
        if (merged.sort) params.sort = merged.sort;
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
    const hasFilters = !!filters.status || !!filters.type || !!filters.validation || !!filters.sort;

    return (
        <AdminLayout
            title="Reportes"
            breadcrumbs={[{ label: 'Reportes' }]}
        >
            <Head title="Reportes — Admin" />

            <div className="space-y-6">
                <FlashMessages />

                {/* Filters */}
                <div className="rounded-2xl border border-default bg-surface-primary p-4 shadow-[var(--shadow-card)]">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
                                <Filter className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-primary">Filtrar reportes</h2>
                                <p className="text-xs text-muted">Ajusta la vista sin perder información</p>
                            </div>
                        </div>
                        <span className="text-xs text-muted">{reports.total.toLocaleString('es-CO')} reportes</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <select
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                applyFilters({ status: e.target.value });
                            }}
                            className={SELECT_CLASS}
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
                            className={SELECT_CLASS}
                        >
                            <option value="" className="bg-white text-gray-900">Todos los tipos</option>
                            {incident_types.map((t: IncidentType) => (
                                <option key={t.id} value={t.id} className="bg-white text-gray-900">{t.name}</option>
                            ))}
                        </select>

                    {/* RF-14: review queue */}
                        <select
                        value={validation}
                        onChange={(e) => {
                            setValidation(e.target.value);
                            applyFilters({ validation: e.target.value });
                        }}
                        className={SELECT_CLASS}
                    >
                        <option value="" className="bg-white text-gray-900">Toda validación</option>
                        <option value="sin_revisar" className="bg-white text-gray-900">Sin revisar</option>
                        <option value="valido" className="bg-white text-gray-900">Validados</option>
                        <option value="invalido" className="bg-white text-gray-900">No válidos</option>
                        </select>

                    {/* RF-12: most supported first */}
                        <select
                        value={sort}
                        onChange={(e) => {
                            setSort(e.target.value);
                            applyFilters({ sort: e.target.value });
                        }}
                        className={SELECT_CLASS}
                    >
                        <option value="" className="bg-white text-gray-900">Más recientes</option>
                        <option value="support" className="bg-white text-gray-900">Más apoyados</option>
                        </select>

                        {hasFilters && (
                            <button
                            onClick={() => {
                                setStatus('');
                                setType('');
                                setValidation('');
                                setSort('');
                                router.get('/admin/reports', {}, { replace: true });
                            }}
                                className="rounded-lg border border-default px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface-tertiary"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-2xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1040px] text-sm">
                            <thead>
                                <tr className="border-b border-default bg-surface-secondary text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                                    <th className="w-[230px] px-5 py-4 font-semibold">Tipo de problema</th>
                                    <th className="min-w-[280px] px-5 py-4 font-semibold">Descripción</th>
                                    <th className="px-5 py-4 font-semibold">Reportado por</th>
                                    <th className="px-5 py-4 font-semibold">Seguimiento</th>
                                    <th className="px-5 py-4 font-semibold">Fecha</th>
                                    <th className="px-5 py-4 text-center font-semibold" title="Apoyos">
                                        <Heart className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                                        <span className="sr-only">Apoyos</span>
                                        <span aria-hidden="true">Apoyos</span>
                                    </th>
                                    <th className="px-5 py-4 text-center font-semibold" title="Comentarios">
                                        <MessageSquare className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                                        <span className="sr-only">Comentarios</span>
                                        <span aria-hidden="true">Comentarios</span>
                                    </th>
                                    <th className="px-5 py-4 font-semibold"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-default">
                                {reportList.map((report) => (
                                    <tr key={report.id} className="group transition-colors odd:bg-white/[0.015] hover:bg-brand-500/[0.06]">
                                        <td className="px-5 py-3.5 align-middle">
                                            <IncidentTypeCell type={report.incident_type} />
                                        </td>

                                        <td className="max-w-[340px] px-5 py-3.5 text-secondary" title={report.description}>
                                            <div className="flex flex-col gap-1">
                                                <span className="line-clamp-2 leading-5">{truncate(report.description, 90)}</span>
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

                                        <td className="whitespace-nowrap px-5 py-3.5 text-secondary">
                                            <div className="flex items-center gap-2.5">
                                                <UserAvatar id={report.user?.id} name={report.user?.name} profilePhoto={report.user?.profile_photo} size="sm" />
                                                <span>{report.user?.name ?? '—'}</span>
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3.5">
                                            <div className="flex flex-col items-start gap-1">
                                                <StatusBadge status={report.status} />
                                                <ValidationBadge value={report.validation_status} />
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-muted">
                                            <span title={new Date(report.created_at).toLocaleString('es-CO')}>
                                                {formatRelativeTime(report.created_at)}
                                            </span>
                                        </td>

                                        <td className="px-5 py-3.5 text-center text-xs text-secondary" title="Apoyos: me gusta + confirmaciones">
                                            <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-rose-500/10 px-2 py-1 font-semibold text-rose-300">
                                                {(report.likes_count ?? 0) + (report.confirmations_count ?? 0)}
                                            </span>
                                        </td>

                                        <td className="px-5 py-3.5 text-center text-xs text-secondary">
                                            <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-sky-500/10 px-2 py-1 font-semibold text-sky-300">
                                                {report.comments_count ?? 0}
                                            </span>
                                        </td>

                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/admin/reports/${report.id}`}
                                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-900/30"
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
                                                            'flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors',
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

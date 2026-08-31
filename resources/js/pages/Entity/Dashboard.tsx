import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Filter, Eye, ChevronLeft, ChevronRight, Heart, MessageSquare } from 'lucide-react';
import EntityLayout from '@/components/shared/EntityLayout';
import StatusBadge from '@/components/reports/StatusBadge';
import { FlashMessages } from '@/components/ui/alert';
import { ENTITY_STATUS_LABELS, formatRelativeTime, truncate } from '@/lib/utils';
import type { PageProps, PaginatedData, Report, ReportStatus, Entity } from '@/types';

interface EntityDashboardProps extends PageProps {
    reports: PaginatedData<Report>;
    filters: { status?: string };
    entity: Pick<Entity, 'id' | 'name'>;
}

const STATUS_OPTIONS: { value: ReportStatus | ''; label: string }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'notificado', label: ENTITY_STATUS_LABELS.notificado },
    { value: 'en_camino', label: 'En camino' },
    { value: 'en_revision', label: 'En revisión' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'resuelto', label: 'Resuelto' },
];

export default function EntityDashboard() {
    const { reports, filters, entity } = usePage<EntityDashboardProps>().props;
    const [status, setStatus] = useState(filters.status ?? '');

    function applyFilters(nextStatus: string) {
        const params: Record<string, string> = {};
        if (nextStatus) params.status = nextStatus;
        router.get('/entidad/dashboard', params, { preserveState: true, replace: true });
    }

    const { data: reportList, current_page, last_page, links } = reports;

    return (
        <EntityLayout entityName={entity.name} breadcrumb="Reportes asignados a tu entidad">
            <Head title="Panel de entidad" />

            <div className="space-y-4">
                <FlashMessages />

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted" />
                        <span className="text-sm text-secondary">Filtros:</span>
                    </div>

                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            applyFilters(e.target.value);
                        }}
                        className="rounded-lg border border-default bg-surface-primary py-2 pl-3 pr-8 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} className="bg-white text-gray-900">{o.label}</option>
                        ))}
                    </select>

                    <span className="ml-auto text-xs text-muted">
                        {reports.total.toLocaleString('es-CO')} reportes
                    </span>
                </div>

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
                                    <th className="px-5 py-3 font-medium">Ciudadano</th>
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
                                            {truncate(report.description, 70)}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3 text-secondary">
                                            {report.user?.name ?? '—'}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3">
                                            <StatusBadge status={report.status} labelOverride={ENTITY_STATUS_LABELS[report.status]} />
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
                                            <Link
                                                href={`/entidad/reportes/${report.id}`}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-900/30"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {reportList.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted">
                                            No hay reportes para tu entidad todavía
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

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
        </EntityLayout>
    );
}

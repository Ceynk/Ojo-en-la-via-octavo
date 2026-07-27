import { useState, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import AppLayout from '@/components/shared/AppLayout';
import ReportCard from '@/components/reports/ReportCard';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { FlashMessages } from '@/components/ui/alert';
import { usePublicChannel } from '@/hooks/useEcho';
import { cn } from '@/lib/utils';
import type { PageProps, PaginatedData, Report, ReportStatus } from '@/types';

type Filters = {
    status: ReportStatus | '';
    incident_type_id: number | '';
    search: string;
};

const STATUS_OPTIONS: { value: ReportStatus | ''; label: string }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_revision', label: 'En revisión' },
    { value: 'notificado', label: 'Notificado' },
    { value: 'resuelto', label: 'Resuelto' },
];

function buildParams(filters: Filters, page: number) {
    const params = new URLSearchParams({ paginate: '1', page: String(page) });
    if (filters.status) params.set('status', filters.status);
    if (filters.incident_type_id) params.set('incident_type_id', String(filters.incident_type_id));
    if (filters.search.trim()) params.set('search', filters.search.trim());
    return params.toString();
}

const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};

export default function Reports() {
    const { incident_types } = usePage<PageProps>().props;
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<Filters>({ status: '', incident_type_id: '', search: '' });
    const [search, setSearch] = useState('');
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const invalidateFeed = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['reports', 'feed'] });
    }, [queryClient]);

    usePublicChannel('reports', 'report.created', invalidateFeed);
    usePublicChannel('reports', 'report.status.changed', invalidateFeed);

    function applySearch() {
        setFilters((f) => ({ ...f, search }));
        setPage(1);
    }

    function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
        setFilters((f) => ({ ...f, [key]: value }));
        setPage(1);
    }

    const { data, isLoading, isFetching } = useQuery<PaginatedData<Report>>({
        queryKey: ['reports', 'feed', filters, page],
        queryFn: () =>
            axios
                .get<PaginatedData<Report>>(`/reports?${buildParams(filters, page)}`)
                .then((r) => r.data),
        placeholderData: (prev) => prev,
        staleTime: 30_000,
    });

    const reports = data?.data ?? [];
    const lastPage = data?.last_page ?? 1;
    const total = data?.total ?? 0;

    return (
        <AppLayout>
            <Head title="Reportes" />

            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <FlashMessages />

                {/* Page header */}
                <div className="mb-6 flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-primary">Reportes ciudadanos</h1>
                    <p className="text-sm text-secondary">
                        Incidentes viales reportados en Villavicencio
                        {total > 0 && ` · ${total} registros`}
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                            placeholder="Buscar por descripción…"
                            className="w-full rounded-lg border border-default bg-surface-primary py-2 pl-9 pr-4 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                        />
                    </div>

                    {/* Status filter */}
                    <div className="relative">
                        <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <select
                            value={filters.status}
                            onChange={(e) => updateFilter('status', e.target.value as ReportStatus | '')}
                            className="appearance-none rounded-lg border border-default bg-surface-primary py-2 pl-9 pr-8 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                        >
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Type filter */}
                    <select
                        value={filters.incident_type_id}
                        onChange={(e) =>
                            updateFilter('incident_type_id', e.target.value ? Number(e.target.value) : '')
                        }
                        className="appearance-none rounded-lg border border-default bg-surface-primary py-2 px-3 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    >
                        <option value="">Todos los tipos</option>
                        {incident_types.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>

                    {/* Active filter indicators */}
                    {(filters.status || filters.incident_type_id || filters.search) && (
                        <button
                            onClick={() => {
                                setFilters({ status: '', incident_type_id: '', search: '' });
                                setSearch('');
                                setPage(1);
                            }}
                            className="text-xs text-brand-600 underline hover:text-brand-700"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="animate-pulse rounded-xl border border-default bg-surface-primary">
                                <div className="aspect-video w-full rounded-t-xl bg-surface-tertiary" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 w-3/4 rounded bg-surface-tertiary" />
                                    <div className="h-3 w-full rounded bg-surface-tertiary" />
                                    <div className="h-3 w-2/3 rounded bg-surface-tertiary" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : reports.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-tertiary">
                            <AlertTriangle className="h-8 w-8 text-muted" />
                        </div>
                        <p className="text-base font-medium text-primary">Sin reportes</p>
                        <p className="mt-1 text-sm text-muted">
                            {filters.status || filters.incident_type_id || filters.search
                                ? 'No hay resultados con los filtros aplicados.'
                                : 'Aún no hay reportes registrados.'}
                        </p>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${JSON.stringify(filters)}-${page}`}
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className={cn(
                                'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
                                isFetching && 'opacity-60 transition-opacity',
                            )}
                        >
                            {reports.map((report) => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    onReportClick={(r) => setSelectedReportId(r.id)}
                                />
                            ))}
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Pagination */}
                {lastPage > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-default text-muted transition-colors hover:bg-surface-tertiary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: lastPage }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === lastPage || Math.abs(p - page) <= 2)
                                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === '…' ? (
                                        <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted">
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p as number)}
                                            className={cn(
                                                'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                                                page === p
                                                    ? 'bg-brand-600 text-white'
                                                    : 'border border-default text-muted hover:bg-surface-tertiary hover:text-primary',
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ),
                                )}
                        </div>

                        <button
                            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                            disabled={page === lastPage}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-default text-muted transition-colors hover:bg-surface-tertiary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Fetching spinner */}
                {isFetching && !isLoading && (
                    <div className="mt-4 flex justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted" />
                    </div>
                )}
            </div>

            {/* Report detail + comments drawer */}
            <ReportDrawer
                reportId={selectedReportId}
                onClose={() => setSelectedReportId(null)}
            />
        </AppLayout>
    );
}

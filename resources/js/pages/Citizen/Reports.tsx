import { useState, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, AlertTriangle, User as UserIcon,
} from 'lucide-react';
import axios from 'axios';
import AppLayout from '@/components/shared/AppLayout';
import ReportCard from '@/components/reports/ReportCard';
import ReportDrawer from '@/components/reports/ReportDrawer';
import FilterChips from '@/components/reports/FilterChips';
import { FlashMessages } from '@/components/ui/alert';
import { usePublicChannel } from '@/hooks/useEcho';
import { cn, haversineDistanceKm } from '@/lib/utils';
import type { PageProps, PaginatedData, Report, ReportStatus } from '@/types';

type SortOption = 'recent' | 'comments' | 'nearest';

type Filters = {
    status: ReportStatus | '';
    incident_type_id: number | '';
    search: string;
    mine: boolean;
};

interface FeedPage extends PaginatedData<Report> {
    distances?: Record<number, number>;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'recent', label: 'Más recientes' },
    { value: 'comments', label: 'Más comentados' },
    { value: 'nearest', label: 'Más cercanos' },
];

const PAGE_SIZE = 12;

function buildParams(filters: Filters, sort: Exclude<SortOption, 'nearest'>, page: number) {
    const params: Record<string, string> = { paginate: '1', page: String(page) };
    if (filters.status) params.status = filters.status;
    if (filters.incident_type_id) params.incident_type_id = String(filters.incident_type_id);
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.mine) params.mine = '1';
    if (sort === 'comments') params.sort = 'comments';
    return params;
}

function buildUnpaginatedParams(filters: Filters) {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.incident_type_id) params.incident_type_id = String(filters.incident_type_id);
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.mine) params.mine = '1';
    return params;
}

const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};

export default function Reports() {
    const { incident_types, auth } = usePage<PageProps>().props;
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<Filters>({ status: '', incident_type_id: '', search: '', mine: false });
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortOption>('recent');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
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

    function toggleStatusFilter(value: ReportStatus) {
        setFilters((f) => ({ ...f, status: f.status === value ? '' : value }));
        setPage(1);
    }

    function selectTypeFilter(value: number | '') {
        setFilters((f) => ({ ...f, incident_type_id: value }));
        setPage(1);
    }

    function toggleMine() {
        setFilters((f) => ({ ...f, mine: !f.mine }));
        setPage(1);
    }

    function handleSortChange(value: SortOption) {
        setSort(value);
        setPage(1);
        setLocationError(null);

        if (value === 'nearest' && !userLocation) {
            if (!navigator.geolocation) {
                setLocationError('Tu navegador no soporta geolocalización.');
                setSort('recent');
                return;
            }
            setLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLocating(false);
                },
                () => {
                    setLocating(false);
                    setLocationError('No se pudo obtener tu ubicación.');
                    setSort('recent');
                },
                { timeout: 8000 },
            );
        }
    }

    const isNearest = sort === 'nearest' && userLocation !== null;

    const { data, isLoading, isFetching } = useQuery<FeedPage>({
        queryKey: ['reports', 'feed', filters, sort, page, userLocation],
        queryFn: async () => {
            if (isNearest) {
                const all = await axios
                    .get<Report[]>('/reports', { params: buildUnpaginatedParams(filters) })
                    .then((r) => r.data);

                const ranked = all
                    .map((report) => ({
                        report,
                        distanceKm: haversineDistanceKm(userLocation!, {
                            lat: report.latitude,
                            lng: report.longitude,
                        }),
                    }))
                    .sort((a, b) => a.distanceKm - b.distanceKm);

                const total = ranked.length;
                const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
                const currentPage = Math.min(page, lastPage);
                const slice = ranked.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

                return {
                    data: slice.map((s) => s.report),
                    distances: Object.fromEntries(slice.map((s) => [s.report.id, s.distanceKm])),
                    current_page: currentPage,
                    last_page: lastPage,
                    per_page: PAGE_SIZE,
                    total,
                    from: total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1,
                    to: (currentPage - 1) * PAGE_SIZE + slice.length,
                    links: [],
                };
            }

            return axios
                .get<PaginatedData<Report>>('/reports', {
                    params: buildParams(filters, sort === 'nearest' ? 'recent' : sort, page),
                })
                .then((r) => r.data);
        },
        placeholderData: (prev) => prev,
        staleTime: 30_000,
    });

    const reports = data?.data ?? [];
    const lastPage = data?.last_page ?? 1;
    const total = data?.total ?? 0;
    const hasActiveFilters = filters.status || filters.incident_type_id || filters.search || filters.mine;

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

                {/* Toolbar */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                            placeholder="Buscar por descripción…"
                            className="w-full rounded-xl border border-white/15 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 outline-none backdrop-blur-md transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 shadow-xs"
                        />
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <ArrowUpDown className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <select
                            value={sort}
                            onChange={(e) => handleSortChange(e.target.value as SortOption)}
                            className="appearance-none rounded-xl border border-white/15 bg-slate-900/80 py-2.5 pl-10 pr-9 text-sm font-medium text-slate-200 outline-none backdrop-blur-md transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 shadow-xs cursor-pointer"
                        >
                            {SORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {locating && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-brand-400">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Ubicando…
                        </span>
                    )}

                    {/* Mine toggle */}
                    {auth.user && (
                        <button
                            onClick={toggleMine}
                            className={cn(
                                'flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all shadow-xs',
                                filters.mine
                                    ? 'border-brand-500 bg-brand-600 text-white shadow-[0_2px_12px_rgba(37,99,235,0.35)]'
                                    : 'border-white/15 bg-slate-900/80 text-slate-300 hover:border-brand-500/40 hover:bg-slate-800/90 hover:text-white',
                            )}
                        >
                            <UserIcon className="h-4 w-4" />
                            Mis reportes
                        </button>
                    )}

                    {/* Active filter indicators */}
                    {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setFilters({ status: '', incident_type_id: '', search: '', mine: false });
                                setSearch('');
                                setPage(1);
                            }}
                            className="text-xs text-brand-600 underline hover:text-brand-700"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>

                {locationError && (
                    <p className="mb-4 text-xs text-red-500">{locationError}</p>
                )}

                {/* Type/status chips */}
                <FilterChips
                    status={filters.status}
                    incidentTypeId={filters.incident_type_id}
                    incidentTypes={incident_types}
                    onToggleStatus={toggleStatusFilter}
                    onSelectType={selectTypeFilter}
                    className="mb-6"
                />

                {/* Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                                <div className="aspect-video w-full rounded-xl bg-white/5" />
                                <div className="mt-4 space-y-2.5">
                                    <div className="h-4 w-3/4 rounded-md bg-white/10" />
                                    <div className="h-3 w-full rounded-md bg-white/5" />
                                    <div className="h-3 w-2/3 rounded-md bg-white/5" />
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
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 text-amber-400 shadow-lg">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <p className="text-base font-bold text-white">Sin reportes</p>
                        <p className="mt-1 text-sm text-slate-400">
                            {hasActiveFilters
                                ? 'No hay resultados con los filtros aplicados.'
                                : 'Aún no hay reportes registrados.'}
                        </p>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${JSON.stringify(filters)}-${sort}-${page}`}
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
                                    distanceKm={data?.distances?.[report.id]}
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
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-slate-900/80 text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-1.5">
                            {Array.from({ length: lastPage }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === lastPage || Math.abs(p - page) <= 2)
                                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === '…' ? (
                                        <span key={`ellipsis-${i}`} className="px-1 text-sm text-slate-500">
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p as number)}
                                            className={cn(
                                                'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all shadow-xs',
                                                page === p
                                                    ? 'border border-brand-500 bg-brand-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                                                    : 'border border-white/15 bg-slate-900/80 text-slate-300 hover:border-brand-500/40 hover:bg-slate-800 hover:text-white',
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
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-slate-900/80 text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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

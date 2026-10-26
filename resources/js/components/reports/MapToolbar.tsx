import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ChevronDown, CalendarDays, SlidersHorizontal, HelpCircle, Check, Loader2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIncidentTypeStyle } from '@/lib/incidentTypeStyle';
import type { IncidentType, ReportStatus } from '@/types';

export type DateRangeFilter = 'all' | 'today' | 'week' | 'month';

const STATUS_OPTIONS: { value: ReportStatus; label: string; dot: string }[] = [
    { value: 'pendiente', label: 'Pendiente', dot: '#f59e0b' },
    { value: 'en_revision', label: 'En revisión', dot: '#3b82f6' },
    { value: 'notificado', label: 'Notificado', dot: '#8b5cf6' },
    { value: 'resuelto', label: 'Resuelto', dot: '#10b981' },
];

const DATE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
    { value: 'all', label: 'Todo el tiempo' },
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
];

interface SearchResult {
    lat: number;
    lng: number;
    label: string;
}

interface MapToolbarProps {
    status: ReportStatus | '';
    onToggleStatus: (value: ReportStatus) => void;
    incidentTypeId: number | '';
    incidentTypes: IncidentType[];
    onSelectType: (value: number | '') => void;
    dateRange: DateRangeFilter;
    onSelectDateRange: (value: DateRangeFilter) => void;
    mineOnly: boolean;
    onToggleMineOnly: () => void;
    onSearchSelect: (result: SearchResult) => void;
    onStartTour: () => void;
    className?: string;
}

// Generic dropdown shell — click-outside + escape to close, one open at a time via `openId`.
function useDropdown(id: string, openId: string | null, setOpenId: (id: string | null) => void) {
    const ref = useRef<HTMLDivElement>(null);
    const isOpen = openId === id;

    useEffect(() => {
        if (!isOpen) return;
        function handlePointerDown(e: PointerEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpenId(null);
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpenId(null);
        }
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen, setOpenId]);

    return { ref, isOpen, toggle: () => setOpenId(isOpen ? null : id) };
}

export default function MapToolbar({
    status,
    onToggleStatus,
    incidentTypeId,
    incidentTypes,
    onSelectType,
    dateRange,
    onSelectDateRange,
    mineOnly,
    onToggleMineOnly,
    onSearchSelect,
    onStartTour,
    className,
}: MapToolbarProps) {
    const [openId, setOpenId] = useState<string | null>(null);
    const category = useDropdown('category', openId, setOpenId);
    const date = useDropdown('date', openId, setOpenId);
    const more = useDropdown('more', openId, setOpenId);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (query.trim().length < 3) {
            setResults([]);
            return;
        }
        setSearching(true);
        const handle = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}, Villavicencio, Colombia&format=json&limit=5&accept-language=es`,
                );
                const data: { lat: string; lon: string; display_name: string }[] = await res.json();
                setResults(data.map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), label: d.display_name })));
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 400);
        return () => clearTimeout(handle);
    }, [query]);

    useEffect(() => {
        function handlePointerDown(e: PointerEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
        }
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, []);

    const selectedType = incidentTypes.find((t) => t.id === incidentTypeId);
    const activeDateLabel = DATE_OPTIONS.find((d) => d.value === dateRange)?.label ?? 'Fecha';
    const moreFiltersActiveCount = mineOnly ? 1 : 0;

    const pillBase =
        'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors';
    const pillInactive = 'border-white/10 bg-white/5 text-secondary hover:bg-white/10 hover:text-primary';
    const pillActive = 'border-transparent text-white shadow-sm';

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {/* Address search */}
            <div ref={searchRef} className="relative min-w-[200px] flex-1 basis-64" data-tour="search">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Buscar dirección, barrio o referencia…"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-sm text-primary placeholder:text-muted outline-none transition-colors focus:border-brand-500 focus:bg-white/10"
                />
                {searching && (
                    <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted" />
                )}
                {!searching && query && (
                    <button
                        onClick={() => { setQuery(''); setResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}

                <AnimatePresence>
                    {searchOpen && results.length > 0 && (
                        <motion.ul
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full z-10 mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-[var(--shadow-elevated)] backdrop-blur-md"
                        >
                            {results.map((r, i) => (
                                <li key={i}>
                                    <button
                                        onClick={() => {
                                            onSearchSelect(r);
                                            setQuery(r.label);
                                            setSearchOpen(false);
                                        }}
                                        className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-secondary transition-colors hover:bg-white/10 hover:text-primary"
                                    >
                                        <Search className="mt-0.5 h-3 w-3 shrink-0 text-muted" />
                                        {r.label}
                                    </button>
                                </li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </div>

            {/* Status toggle "dropdowns" */}
            <div className="flex shrink-0 items-center gap-2" data-tour="filters">
                {STATUS_OPTIONS.map((opt) => {
                    const active = status === opt.value;
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onToggleStatus(opt.value)}
                            style={active ? { backgroundColor: opt.dot } : undefined}
                            className={cn(pillBase, active ? pillActive : pillInactive)}
                        >
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: active ? 'rgba(255,255,255,0.9)' : opt.dot }}
                            />
                            {opt.label}
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>
                    );
                })}
            </div>

            {/* Category dropdown */}
            <div ref={category.ref} className="relative shrink-0">
                <button onClick={category.toggle} className={cn(pillBase, pillInactive)}>
                    {selectedType ? (
                        <>
                            {(() => {
                                const { color, Icon } = getIncidentTypeStyle(selectedType);
                                return <Icon className="h-3.5 w-3.5" style={{ color }} />;
                            })()}
                            {selectedType.name}
                        </>
                    ) : (
                        'Todas las categorías'
                    )}
                    <ChevronDown className={cn('h-3 w-3 opacity-60 transition-transform', category.isOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                    {category.isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 top-full z-10 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-[var(--shadow-elevated)] backdrop-blur-md"
                        >
                            <button
                                onClick={() => { onSelectType(''); setOpenId(null); }}
                                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-secondary transition-colors hover:bg-white/10 hover:text-primary"
                            >
                                Todas las categorías
                                {incidentTypeId === '' && <Check className="h-3.5 w-3.5 text-brand-400" />}
                            </button>
                            {incidentTypes.map((type) => {
                                const { color, Icon } = getIncidentTypeStyle(type);
                                const active = incidentTypeId === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => { onSelectType(type.id); setOpenId(null); }}
                                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-secondary transition-colors hover:bg-white/10 hover:text-primary"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon className="h-4 w-4" style={{ color }} />
                                            {type.name}
                                        </span>
                                        {active && <Check className="h-3.5 w-3.5 text-brand-400" />}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Date dropdown */}
            <div ref={date.ref} className="relative shrink-0">
                <button onClick={date.toggle} className={cn(pillBase, pillInactive)}>
                    <CalendarDays className="h-3.5 w-3.5" />
                    {activeDateLabel}
                    <ChevronDown className={cn('h-3 w-3 opacity-60 transition-transform', date.isOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                    {date.isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-[var(--shadow-elevated)] backdrop-blur-md"
                        >
                            {DATE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { onSelectDateRange(opt.value); setOpenId(null); }}
                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-secondary transition-colors hover:bg-white/10 hover:text-primary"
                                >
                                    {opt.label}
                                    {dateRange === opt.value && <Check className="h-3.5 w-3.5 text-brand-400" />}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* More filters dropdown */}
            <div ref={more.ref} className="relative shrink-0">
                <button onClick={more.toggle} className={cn(pillBase, pillInactive, 'relative')}>
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Más filtros
                    {moreFiltersActiveCount > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                            {moreFiltersActiveCount}
                        </span>
                    )}
                </button>

                <AnimatePresence>
                    {more.isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 top-full z-10 mt-2 w-56 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-[var(--shadow-elevated)] backdrop-blur-md"
                        >
                            <label className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-secondary transition-colors hover:bg-white/10 hover:text-primary">
                                Solo mis reportes
                                <input
                                    type="checkbox"
                                    checked={mineOnly}
                                    onChange={onToggleMineOnly}
                                    className="h-4 w-4 accent-brand-600"
                                />
                            </label>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Guided tour trigger */}
            <button
                onClick={onStartTour}
                data-tour="help-trigger"
                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-300 transition-colors hover:bg-brand-500/20"
            >
                <HelpCircle className="h-4 w-4" />
                ¿Cómo reportar?
            </button>
        </div>
    );
}

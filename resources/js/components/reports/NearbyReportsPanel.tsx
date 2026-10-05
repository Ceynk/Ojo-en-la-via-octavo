import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, List, MapPinOff, Check } from 'lucide-react';
import { cn, formatDistanceKm, formatRelativeTime, haversineDistanceKm, truncate } from '@/lib/utils';
import { getIncidentTypeStyle } from '@/lib/incidentTypeStyle';
import StatusBadge from './StatusBadge';
import type { Report } from '@/types';

interface NearbyReportsPanelProps {
    reports: Report[];
    userLocation?: { lat: number; lng: number } | null;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onReportClick: (reportId: number) => void;
    radiusKm: number;
    onChangeRadius: (radiusKm: number) => void;
    className?: string;
}

const MAX_ITEMS = 8;
export const RADIUS_OPTIONS_KM = [1, 2, 5, 10, 20, 50];

export default function NearbyReportsPanel({
    reports,
    userLocation,
    collapsed,
    onToggleCollapsed,
    onReportClick,
    radiusKm,
    onChangeRadius,
    className,
}: NearbyReportsPanelProps) {
    const [radiusOpen, setRadiusOpen] = useState(false);
    const radiusRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!radiusOpen) return;
        function handlePointerDown(e: PointerEvent) {
            if (radiusRef.current && !radiusRef.current.contains(e.target as Node)) setRadiusOpen(false);
        }
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [radiusOpen]);

    const ranked = userLocation
        ? [...reports]
              .map((r) => ({ report: r, distanceKm: haversineDistanceKm(userLocation, { lat: r.latitude, lng: r.longitude }) }))
              .filter((r) => r.distanceKm <= radiusKm)
              .sort((a, b) => a.distanceKm - b.distanceKm)
        : [...reports]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((report) => ({ report, distanceKm: undefined as number | undefined }));

    const items = ranked.slice(0, MAX_ITEMS);

    return (
        <div className={cn('pointer-events-none flex items-start', className)}>
            <AnimatePresence initial={false} mode="popLayout">
                {!collapsed && (
                    <motion.div
                        key="panel"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="pointer-events-auto flex h-full max-h-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 shadow-2xl backdrop-blur-2xl"
                    >
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse shrink-0" />
                                <h2 className="truncate text-sm font-bold tracking-tight text-white">Reportes cerca de ti</h2>
                            </div>

                            {/* Radius selector */}
                            <div ref={radiusRef} className="relative shrink-0">
                                <button
                                    onClick={() => setRadiusOpen((o) => !o)}
                                    disabled={!userLocation}
                                    className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition-all hover:border-brand-500/40 hover:bg-brand-500/15 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-40 shadow-xs"
                                    title={userLocation ? 'Radio de búsqueda' : 'Activa tu ubicación para filtrar por radio'}
                                >
                                    {radiusKm} km
                                </button>

                                <AnimatePresence>
                                    {radiusOpen && userLocation && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-full z-10 mt-1.5 w-32 overflow-hidden rounded-xl border border-white/15 bg-slate-900/98 p-1.5 shadow-2xl backdrop-blur-2xl"
                                        >
                                            {RADIUS_OPTIONS_KM.map((km) => (
                                                <button
                                                    key={km}
                                                    onClick={() => {
                                                        onChangeRadius(km);
                                                        setRadiusOpen(false);
                                                    }}
                                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                                >
                                                    {km} km
                                                    {radiusKm === km && <Check className="h-3.5 w-3.5 text-brand-400" />}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                onClick={onToggleCollapsed}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                                title="Ocultar panel"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                                    <MapPinOff className="h-6 w-6 text-slate-500" />
                                    <p className="text-xs text-slate-400">
                                        {userLocation
                                            ? `Sin reportes a menos de ${radiusKm} km de ti.`
                                            : 'Sin reportes para mostrar aquí.'}
                                    </p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/10">
                                    {items.map(({ report, distanceKm }) => {
                                        const { color, Icon } = getIncidentTypeStyle(report.incident_type);
                                        return (
                                            <li key={report.id}>
                                                <button
                                                    onClick={() => onReportClick(report.id)}
                                                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.07]"
                                                >
                                                    <div
                                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 shadow-xs"
                                                        style={{ backgroundColor: `${color}25`, color }}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-slate-100">
                                                            {report.incident_type?.name ?? 'Reporte'}
                                                        </p>
                                                        <p className="truncate text-xs text-slate-400">
                                                            {truncate(report.address_text ?? '', 40)}
                                                        </p>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className="text-[11px] text-slate-400">
                                                                {formatRelativeTime(report.created_at)}
                                                            </span>
                                                            {distanceKm !== undefined && (
                                                                <span className="text-[11px] font-semibold text-amber-400">
                                                                    · {formatDistanceKm(distanceKm)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={report.status} className="shrink-0 text-[10px]" />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <div className="shrink-0 border-t border-white/10 p-3">
                            <Link
                                href="/reportes"
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-gradient-to-r from-brand-600/20 to-brand-500/20 py-2.5 text-xs font-semibold text-brand-200 transition-all hover:bg-brand-500/30 hover:border-brand-500/50 hover:text-white shadow-xs"
                            >
                                <List className="h-4 w-4" />
                                Ver todos los reportes
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {collapsed && (
                <button
                    onClick={onToggleCollapsed}
                    className="pointer-events-auto flex h-10 w-8 items-center justify-center rounded-r-xl border border-l-0 border-white/15 bg-slate-900/95 text-slate-300 shadow-xl backdrop-blur-md transition-all hover:bg-brand-600 hover:text-white"
                    title="Mostrar reportes cercanos"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

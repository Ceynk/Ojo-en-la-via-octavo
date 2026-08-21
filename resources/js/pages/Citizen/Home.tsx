import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Locate, Loader2 } from 'lucide-react';
import axios from 'axios';
import AppLayout from '@/components/shared/AppLayout';
import GuidedTour, { type TourStep } from '@/components/shared/GuidedTour';
import MapView, { type MapViewHandle } from '@/components/reports/MapView';
import ReportForm from '@/components/reports/ReportForm';
import ReportDrawer from '@/components/reports/ReportDrawer';
import ReportPreviewCard from '@/components/reports/ReportPreviewCard';
import NearbyReportsPanel, { RADIUS_OPTIONS_KM } from '@/components/reports/NearbyReportsPanel';
import MapToolbar, { type DateRangeFilter } from '@/components/reports/MapToolbar';
import { FlashMessages } from '@/components/ui/alert';
import { usePublicChannel } from '@/hooks/useEcho';
import type { PageProps, Report, ReportStatus } from '@/types';

interface Coords {
    lat: number;
    lng: number;
    address: string;
}

type Filters = {
    status: ReportStatus | '';
    incident_type_id: number | '';
    mine: boolean;
};

function buildParams(filters: Filters) {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.incident_type_id) params.incident_type_id = String(filters.incident_type_id);
    if (filters.mine) params.mine = '1';
    return params;
}

function isWithinDateRange(createdAt: string, range: DateRangeFilter): boolean {
    if (range === 'all') return true;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    if (range === 'today') return now - created < day;
    if (range === 'week') return now - created < 7 * day;
    return now - created < 30 * day; // month
}

const TOUR_STEPS: TourStep[] = [
    {
        selector: '[data-tour="search"]',
        title: 'Busca tu ubicación',
        description: 'Escribe una dirección, barrio o punto de referencia para encontrar rápido el lugar del incidente en el mapa.',
    },
    {
        selector: '.map-canvas',
        title: 'Marca el punto exacto',
        description: 'Toca el lugar exacto en el mapa donde está el problema vial. Se abrirá un formulario ya ubicado en ese punto.',
    },
    {
        selector: '[data-tour="fab"]',
        title: '¿Ya estás en el lugar?',
        description: 'Presiona este botón y usaremos tu ubicación actual como punto del reporte, sin necesidad de tocar el mapa.',
    },
    {
        selector: '[data-tour="nearby"]',
        title: 'Reportes cerca de ti',
        description: 'En este panel ves los incidentes más cercanos a tu ubicación. Tócalos para ver el detalle sin perder tu lugar en el mapa.',
    },
    {
        title: 'Completa tu reporte',
        description: 'Selecciona el tipo de incidente, describe qué pasó, confirma la dirección y agrega una foto si puedes. Al enviarlo, quedará visible para todos y para las entidades responsables.',
    },
];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
            { headers: { 'Accept-Language': 'es' } },
        );
        const data = await res.json();
        return (data.display_name as string | undefined) ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
}

export default function Home() {
    const { incident_types } = usePage<PageProps>().props;
    const [formOpen, setFormOpen] = useState(false);
    const [coords, setCoords] = useState<Coords | null>(null);
    const [locating, setLocating] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const [previewReportId, setPreviewReportId] = useState<number | null>(null);
    const [filters, setFilters] = useState<Filters>({ status: '', incident_type_id: '', mine: false });
    const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [tourOpen, setTourOpen] = useState(false);
    const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(() => {
        const stored = Number(localStorage.getItem('nearbyRadiusKm'));
        return RADIUS_OPTIONS_KM.includes(stored) ? stored : 5;
    });
    const mapRef = useRef<MapViewHandle>(null);
    const topBarRef = useRef<HTMLDivElement>(null);
    const [belowTopBar, setBelowTopBar] = useState(96);
    const queryClient = useQueryClient();

    function handleChangeRadius(km: number) {
        setRadiusKm(km);
        localStorage.setItem('nearbyRadiusKm', String(km));
    }

    // The toolbar's height varies (it wraps, filters get added/removed, etc.) — measure it
    // instead of hardcoding a top offset for the panels that sit below it.
    useEffect(() => {
        const el = topBarRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            setBelowTopBar(entry.target.getBoundingClientRect().height + 16 + 16);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Keep a live "you are here" dot on the map at all times, independent of the report-placement flow
    useEffect(() => {
        if (!navigator.geolocation) return;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const { data: reports = [], isLoading } = useQuery<Report[]>({
        queryKey: ['reports', filters],
        queryFn: () =>
            axios.get<Report[]>('/reports', { params: buildParams(filters) }).then((r) => r.data),
        staleTime: 1000 * 60,
    });

    const visibleReports = useMemo(
        () => reports.filter((r) => isWithinDateRange(r.created_at, dateRange)),
        [reports, dateRange],
    );

    const previewReport = useMemo(
        () => visibleReports.find((r) => r.id === previewReportId) ?? null,
        [visibleReports, previewReportId],
    );

    function toggleStatusFilter(value: ReportStatus) {
        setFilters((f) => ({ ...f, status: f.status === value ? '' : value }));
    }

    function selectTypeFilter(value: number | '') {
        setFilters((f) => ({ ...f, incident_type_id: value }));
    }

    function toggleMineOnly() {
        setFilters((f) => ({ ...f, mine: !f.mine }));
    }

    // Real-time: refresh map markers when reports are created or updated
    const invalidateReports = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['reports'] });
    }, [queryClient]);

    usePublicChannel('reports', 'report.created', invalidateReports);
    usePublicChannel('reports', 'report.status.changed', invalidateReports);

    const handleMapClick = useCallback(async (lat: number, lng: number) => {
        setFormOpen(true);
        setCoords({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        const address = await reverseGeocode(lat, lng);
        setCoords({ lat, lng, address });
    }, []);

    const handleReportClick = useCallback((id: number) => {
        setPreviewReportId(id);
    }, []);

    function handleViewDetails(id: number) {
        setSelectedReportId(id);
        setPreviewReportId(null);
    }

    function handleSearchSelect(result: { lat: number; lng: number }) {
        mapRef.current?.flyTo(result.lat, result.lng, 15);
    }

    async function handleFabClick() {
        // Reuse the live "you are here" position we're already tracking — avoids a fresh GPS
        // fix landing a few meters away from the dot the user is already looking at.
        const position =
            myLocation ??
            (await new Promise<{ lat: number; lng: number } | null>((resolve) => {
                if (!navigator.geolocation) {
                    resolve(null);
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => resolve(null),
                    { timeout: 4000 },
                );
            }));

        const { lat, lng } = position ?? mapRef.current?.getCenter() ?? { lat: 4.142, lng: -73.6266 };
        setFormOpen(true);
        setCoords({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        const address = await reverseGeocode(lat, lng);
        setCoords({ lat, lng, address });
    }

    function handleLocate() {
        if (locating) return;

        // Already have a live fix — use it instead of requesting a brand new one.
        if (myLocation) {
            const { lat, lng } = myLocation;
            setFormOpen(true);
            setCoords({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
            reverseGeocode(lat, lng).then((address) => setCoords({ lat, lng, address }));
            return;
        }

        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setFormOpen(true);
                setCoords({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
                const address = await reverseGeocode(lat, lng);
                setCoords({ lat, lng, address });
                setLocating(false);
            },
            () => setLocating(false),
            { timeout: 10000 },
        );
    }

    function handleFormClose() {
        setFormOpen(false);
        setCoords(null);
    }

    function handleFormSuccess() {
        queryClient.invalidateQueries({ queryKey: ['reports'] });
    }

    return (
        <AppLayout>
            <Head title="Mapa" />

            <div className="relative" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
                {/* Top overlay stack: flash messages + toolbar */}
                <div ref={topBarRef} className="absolute inset-x-4 top-4 z-[550] flex flex-col gap-2">
                    <FlashMessages />

                    <div className="relative rounded-2xl border border-white/10 bg-slate-900/85 p-2 shadow-[var(--shadow-elevated)] backdrop-blur-md">
                        <MapToolbar
                            status={filters.status}
                            onToggleStatus={toggleStatusFilter}
                            incidentTypeId={filters.incident_type_id}
                            incidentTypes={incident_types}
                            onSelectType={selectTypeFilter}
                            dateRange={dateRange}
                            onSelectDateRange={setDateRange}
                            mineOnly={filters.mine}
                            onToggleMineOnly={toggleMineOnly}
                            onSearchSelect={handleSearchSelect}
                            onStartTour={() => setTourOpen(true)}
                        />
                        {isLoading && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
                            </span>
                        )}
                    </div>
                </div>

                {/* Leaflet map */}
                <MapView
                    ref={mapRef}
                    reports={visibleReports}
                    selectedCoords={coords}
                    userLocation={myLocation}
                    radiusKm={radiusKm}
                    onMapClick={handleMapClick}
                    onReportClick={handleReportClick}
                    className="map-canvas h-full w-full"
                />

                {/* Left: collapsible nearby-reports panel */}
                <div
                    data-tour="nearby"
                    className="absolute left-4 z-[500] flex"
                    style={{ top: belowTopBar, bottom: '5.5rem' }}
                >
                    <NearbyReportsPanel
                        reports={visibleReports}
                        userLocation={myLocation}
                        collapsed={sidebarCollapsed}
                        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
                        onReportClick={handleReportClick}
                        radiusKm={radiusKm}
                        onChangeRadius={handleChangeRadius}
                        className="h-full"
                    />
                </div>

                {/* Right: report preview card */}
                <div className="absolute right-4 z-[600]" style={{ top: belowTopBar }}>
                    <ReportPreviewCard
                        report={previewReport}
                        onClose={() => setPreviewReportId(null)}
                        onViewDetails={handleViewDetails}
                    />
                </div>

                {/* Bottom-left cluster: locate me */}
                <div className="absolute bottom-6 left-4 z-[500]">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLocate}
                        disabled={locating}
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-slate-900/85 text-white shadow-[var(--shadow-modal)] backdrop-blur-md transition-colors hover:bg-slate-800/90 disabled:opacity-60"
                        title="Mi ubicación"
                    >
                        {locating ? (
                            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                        ) : (
                            <Locate className="h-5 w-5" />
                        )}
                    </motion.button>
                </div>

                {/* Bottom-right cluster: report FAB (zoom control sits above it, see .map-canvas CSS) */}
                <div data-tour="fab" className="absolute bottom-6 right-4 z-[500] flex flex-col items-center gap-1.5">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleFabClick}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-[var(--shadow-modal)] transition-colors hover:bg-brand-700"
                        title="Registrar incidente"
                    >
                        <Plus className="h-6 w-6" />
                    </motion.button>
                    <span
                        className="text-center text-[11px] font-semibold leading-tight text-white"
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
                    >
                        Reportar<br />un incidente
                    </span>
                </div>

                {/* Report form slide-in panel */}
                <AnimatePresence>
                    {formOpen && (
                        <>
                            {/* Mobile backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={handleFormClose}
                                className="absolute inset-0 z-[1100] bg-black/30 backdrop-blur-sm md:hidden"
                            />

                            {/* z-[1200]: Leaflet's own controls (zoom, attribution) sit at z-index 1000,
                                so this panel must clear that or they'd show through on top of it. */}
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                                className="absolute right-0 top-0 z-[1200] h-full w-full max-w-sm bg-white shadow-[var(--shadow-modal)]"
                            >
                                <ReportForm
                                    coords={coords}
                                    onClose={handleFormClose}
                                    onSuccess={handleFormSuccess}
                                />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <GuidedTour steps={TOUR_STEPS} open={tourOpen} onClose={() => setTourOpen(false)} />
            </div>

            {/* Report detail + comments drawer */}
            <ReportDrawer
                reportId={selectedReportId}
                onClose={() => setSelectedReportId(null)}
            />
        </AppLayout>
    );
}

import { useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Locate, Loader2 } from 'lucide-react';
import axios from 'axios';
import AppLayout from '@/components/shared/AppLayout';
import MapView from '@/components/reports/MapView';
import ReportForm from '@/components/reports/ReportForm';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { FlashMessages } from '@/components/ui/alert';
import { usePublicChannel } from '@/hooks/useEcho';
import type { Report } from '@/types';

interface Coords {
    lat: number;
    lng: number;
    address: string;
}

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
    const [formOpen, setFormOpen] = useState(false);
    const [coords, setCoords] = useState<Coords | null>(null);
    const [locating, setLocating] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data: reports = [], isLoading } = useQuery<Report[]>({
        queryKey: ['reports'],
        queryFn: () => axios.get<Report[]>('/reports').then((r) => r.data),
        staleTime: 1000 * 60,
    });

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

    function handleLocate() {
        if (!navigator.geolocation || locating) return;
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
                {/* Flash messages */}
                <div className="absolute left-4 right-4 top-4 z-[1000]">
                    <FlashMessages />
                </div>

                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
                        <div className="flex items-center gap-2 rounded-full bg-surface-primary px-3 py-1.5 shadow-[var(--shadow-elevated)] text-xs text-secondary">
                            <Loader2 className="h-3 w-3 animate-spin text-brand-600" />
                            Cargando reportes…
                        </div>
                    </div>
                )}

                {/* Leaflet map */}
                <MapView
                    reports={reports}
                    selectedCoords={coords}
                    onMapClick={handleMapClick}
                    onReportClick={(id) => setSelectedReportId(id)}
                    className="h-full w-full"
                />

                {/* Locate me button */}
                <div className="absolute bottom-6 left-4 z-[500]">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLocate}
                        disabled={locating}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-primary shadow-[var(--shadow-modal)] text-secondary transition-colors hover:bg-surface-tertiary disabled:opacity-60"
                        title="Mi ubicación"
                    >
                        {locating ? (
                            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                        ) : (
                            <Locate className="h-5 w-5" />
                        )}
                    </motion.button>
                </div>

                {/* FAB */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFormOpen(true)}
                    className="absolute bottom-6 right-4 z-[500] flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-[var(--shadow-modal)] transition-colors hover:bg-brand-700"
                    title="Registrar incidente"
                >
                    <Plus className="h-6 w-6" />
                </motion.button>

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
                                className="absolute inset-0 z-[600] bg-black/30 backdrop-blur-sm md:hidden"
                            />

                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                                className="absolute right-0 top-0 z-[700] h-full w-full max-w-sm bg-surface-primary shadow-[var(--shadow-modal)]"
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
            </div>

            {/* Report detail + comments drawer */}
            <ReportDrawer
                reportId={selectedReportId}
                onClose={() => setSelectedReportId(null)}
            />
        </AppLayout>
    );
}

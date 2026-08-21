import { useEffect, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin, Navigation, Volume2, Loader2, Check, Camera,
    AlertTriangle, CheckCircle2, X, ChevronDown, ChevronUp, Tag,
} from 'lucide-react';
import OperatorLayout from '@/components/shared/OperatorLayout';
import ReportPreviewCard from '@/components/reports/ReportPreviewCard';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { FlashMessages } from '@/components/ui/alert';
import { cn, distanceInMeters, formatDistanceKm, ENTITY_STATUS_LABELS } from '@/lib/utils';
import { fetchRoute, type Route } from '@/lib/osrm';
import { speak } from '@/lib/voice';
import type { PageProps, Report } from '@/types';

const GEOFENCE_METERS = 10;
const ROUTE_REFRESH_METERS = 50;

interface OperatorNavigateProps extends PageProps {
    report: Report;
}

export default function OperatorNavigate() {
    const { report } = usePage<OperatorNavigateProps>().props;

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const meMarkerRef = useRef<L.Marker | null>(null);
    const routeLineRef = useRef<L.Polyline | null>(null);
    const lastRouteFixRef = useRef<{ lat: number; lng: number } | null>(null);
    const lastSpokenRef = useRef<string | null>(null);

    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [route, setRoute] = useState<Route | null>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [panelCollapsed, setPanelCollapsed] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(true);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const destination = { lat: report.latitude, lng: report.longitude };
    const distance = position ? distanceInMeters(position, destination) : null;
    const withinGeofence = distance !== null && distance <= GEOFENCE_METERS;

    // Map setup
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, { zoomControl: true }).setView(
            [destination.lat, destination.lng],
            15,
        );
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        L.marker([destination.lat, destination.lng], { icon: destinationIcon() })
            .addTo(map)
            .on('click', () => setPreviewOpen((o) => !o));

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Live geolocation
    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoError('Tu navegador no soporta geolocalización.');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGeoError(null);
            },
            () => setGeoError('No se pudo obtener tu ubicación. Activa el GPS y los permisos de ubicación.'),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // Move "me" marker as position updates
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !position) return;

        if (meMarkerRef.current) {
            meMarkerRef.current.setLatLng([position.lat, position.lng]);
        } else {
            meMarkerRef.current = L.marker([position.lat, position.lng], { icon: meIcon() }).addTo(map);
            map.fitBounds([[position.lat, position.lng], [destination.lat, destination.lng]], { padding: [40, 40] });
        }
    }, [position]);

    // Fetch/refresh the route as the operator moves
    useEffect(() => {
        if (!position) return;

        const last = lastRouteFixRef.current;
        const moved = !last || distanceInMeters(last, position) >= ROUTE_REFRESH_METERS;
        if (!moved) return;

        lastRouteFixRef.current = position;

        fetchRoute(position, destination)
            .then((r) => {
                setRoute(r);
                setStepIndex(0);
                drawRoute(r);
            })
            .catch(() => {
                // Routing failure shouldn't block navigation — the map/geofence still work
                // from raw GPS distance alone.
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [position]);

    // Advance to the next step and speak it once we're close to the current step's maneuver
    useEffect(() => {
        if (!route || !position) return;
        const step = route.steps[stepIndex];
        if (!step) return;

        const stepDistance = distanceInMeters(position, { lat: step.location[1], lng: step.location[0] });
        if (stepDistance < 25 && stepIndex < route.steps.length - 1) {
            setStepIndex((i) => i + 1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [position, route]);

    const currentStep = route?.steps[stepIndex] ?? null;

    // Read the current instruction out loud automatically — the moment a route first
    // loads (announcing step 1) and every time we advance to a new step. Guarded by
    // lastSpokenRef so a route re-fetch that lands on the same step text doesn't repeat it.
    useEffect(() => {
        if (!currentStep) return;
        if (lastSpokenRef.current === currentStep.instructionText) return;
        lastSpokenRef.current = currentStep.instructionText;
        speak(currentStep.instructionText);
    }, [currentStep]);

    function drawRoute(r: Route) {
        const map = mapRef.current;
        if (!map) return;
        routeLineRef.current?.remove();
        routeLineRef.current = L.polyline(r.coordinates, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(map);
    }

    // Ping the operator's location to the entity's live map every ~6s. While "en camino",
    // this same endpoint is also what confirms the geofence server-side and flips the
    // report to "en_revision" automatically — no button for that transition.
    useEffect(() => {
        if (!position) return;
        const timeout = setTimeout(() => {
            axios.post('/operador/ubicacion', { ...position, report_id: report.id })
                .then((res) => {
                    const newStatus = res.data?.status;
                    if (newStatus && newStatus !== report.status) {
                        router.reload({ only: ['report'] });
                    }
                })
                .catch(() => {});
        }, 6000);
        return () => clearTimeout(timeout);
    }, [position, report.id, report.status]);

    return (
        <OperatorLayout breadcrumb={`Reporte #${report.id}`} fullBleed>
            <Head title={`Navegando — Reporte #${report.id}`} />

            {/* Full-bleed map, exactly like the citizen's map view — everything else floats on top. */}
            <div className="relative" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
                <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

                <div className="pointer-events-none absolute inset-x-0 top-0 z-[550] flex flex-col gap-2 p-3">
                    <FlashMessages />

                    {geoError && (
                        <div className="pointer-events-auto ml-11 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-amber-300 shadow-[var(--shadow-elevated)] backdrop-blur-md">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {geoError}
                        </div>
                    )}

                    {currentStep && (
                        <div className="pointer-events-auto ml-11 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 p-3 shadow-[var(--shadow-elevated)] backdrop-blur-md">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                                <Navigation className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{currentStep.instructionText}</p>
                                <p className="text-xs text-white/50">en {formatDistanceKm(currentStep.distanceMeters / 1000)}</p>
                            </div>
                            <button
                                onClick={() => speak(currentStep.instructionText)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                title="Repetir indicación por voz"
                            >
                                <Volume2 className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Full report info — same card the citizen's map uses, toggled by tapping the destination pin */}
                    <div className="pointer-events-auto ml-auto">
                        {previewOpen ? (
                            <ReportPreviewCard
                                report={report}
                                onClose={() => setPreviewOpen(false)}
                                onViewDetails={() => setDetailsOpen(true)}
                                statusLabels={ENTITY_STATUS_LABELS}
                            />
                        ) : (
                            <button
                                onClick={() => setPreviewOpen(true)}
                                className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-sm text-white/80 shadow-[var(--shadow-elevated)] backdrop-blur-md transition-colors hover:bg-slate-800/90 hover:text-white"
                            >
                                <Tag className="h-3.5 w-3.5" />
                                Ver información del reporte
                            </button>
                        )}
                    </div>
                </div>

                {/* Bottom sheet — collapsible dark floating panel, same look as the citizen's "reportes cercanos" panel */}
                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[550] flex justify-center">
                    <AnimatePresence initial={false} mode="popLayout">
                        {!panelCollapsed ? (
                            <motion.div
                                key="panel"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="pointer-events-auto mx-3 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-[var(--shadow-elevated)] backdrop-blur-md"
                            >
                                <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">{report.incident_type?.name}</p>
                                        <p className="flex items-center gap-1 truncate text-xs text-white/50">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            {report.address_text}
                                        </p>
                                    </div>
                                    <div className={cn(
                                        'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                                        withinGeofence ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60',
                                    )}>
                                        {distance !== null ? `${Math.round(distance)} m` : '— m'}
                                    </div>
                                    <button
                                        onClick={() => setPanelCollapsed(true)}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                        title="Ocultar panel"
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="p-4">
                                    {report.status === 'en_camino' && (
                                        <div className="flex items-start gap-2 text-sm text-white/70">
                                            <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                                            <span>
                                                Vas en camino. El estado cambiará a "En revisión" automáticamente en cuanto tu GPS confirme
                                                que llegaste (a menos de {GEOFENCE_METERS} m del incidente).
                                            </span>
                                        </div>
                                    )}

                                    {report.status === 'en_revision' && (
                                        <MarkEnProcesoCard report={report} withinGeofence={withinGeofence} position={position} />
                                    )}

                                    {report.status === 'en_proceso' && (
                                        <ResolveCard report={report} withinGeofence={withinGeofence} position={position} />
                                    )}

                                    {report.status === 'resuelto' && (
                                        <div className="flex items-center gap-2 text-sm text-emerald-300">
                                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                                            Este reporte ya fue marcado como resuelto.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.button
                                key="handle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setPanelCollapsed(false)}
                                className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-sm text-white/80 shadow-[var(--shadow-elevated)] backdrop-blur-md transition-colors hover:bg-slate-800/90 hover:text-white"
                            >
                                <ChevronUp className="h-4 w-4" />
                                {distance !== null ? `${Math.round(distance)} m` : '— m'} · {report.incident_type?.name}
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <ReportDrawer
                reportId={detailsOpen ? report.id : null}
                onClose={() => setDetailsOpen(false)}
                statusLabels={ENTITY_STATUS_LABELS}
            />
        </OperatorLayout>
    );
}

function MarkEnProcesoCard({
    report, withinGeofence, position,
}: { report: Report; withinGeofence: boolean; position: { lat: number; lng: number } | null }) {
    const form = useForm({ latitude: '', longitude: '' });

    function submit() {
        if (!position) return;
        form.transform(() => ({ latitude: position.lat, longitude: position.lng }));
        form.post(`/operador/reportes/${report.id}/en-proceso`);
    }

    return (
        <div>
            <h3 className="mb-2 text-sm font-semibold text-white">Empezar a trabajar</h3>
            <p className="mb-3 text-xs text-white/50">
                Ya estás en el sitio. Confirma para marcar el reporte como "en proceso" mientras resuelves el incidente.
            </p>
            {form.errors.latitude && <p className="mb-2 text-xs text-red-400">{form.errors.latitude}</p>}
            <button
                onClick={submit}
                disabled={!withinGeofence || form.processing}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {withinGeofence ? 'Empezar a trabajar' : `Acércate al sitio (≤${GEOFENCE_METERS} m)`}
            </button>
        </div>
    );
}

function ResolveCard({
    report, withinGeofence, position,
}: { report: Report; withinGeofence: boolean; position: { lat: number; lng: number } | null }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const form = useForm<{ latitude: string | number; longitude: string | number; evidence: File[] }>({
        latitude: '',
        longitude: '',
        evidence: [],
    });

    function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        form.setData('evidence', files);
    }

    function removeFile(index: number) {
        form.setData('evidence', form.data.evidence.filter((_, i) => i !== index));
    }

    function submit() {
        if (!position || form.data.evidence.length === 0) return;
        form.transform((data) => ({ ...data, latitude: position.lat, longitude: position.lng }));
        form.post(`/operador/reportes/${report.id}/resuelto`, { forceFormData: true });
    }

    return (
        <div>
            <h3 className="mb-2 text-sm font-semibold text-white">Marcar como resuelto</h3>
            <p className="mb-3 text-xs text-white/50">
                Sube al menos una foto o video como evidencia de la resolución. Debes seguir a menos de {GEOFENCE_METERS} m del incidente.
            </p>

            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
                <Camera className="h-4 w-4" />
                Agregar foto o video
            </button>
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                multiple
                className="hidden"
                onChange={handleFiles}
            />

            {form.data.evidence.length > 0 && (
                <ul className="mb-3 space-y-1">
                    {form.data.evidence.map((file, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70">
                            <span className="truncate">{file.name}</span>
                            <button type="button" onClick={() => removeFile(i)} className="shrink-0 text-white/50 hover:text-red-400">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {form.errors.latitude && <p className="mb-2 text-xs text-red-400">{form.errors.latitude}</p>}
            {form.errors.evidence && <p className="mb-2 text-xs text-red-400">{form.errors.evidence}</p>}

            <button
                onClick={submit}
                disabled={!withinGeofence || form.data.evidence.length === 0 || form.processing}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {withinGeofence ? 'Marcar resuelto' : `Acércate al sitio (≤${GEOFENCE_METERS} m)`}
            </button>
        </div>
    );
}

function destinationIcon(): L.DivIcon {
    return L.divIcon({
        html: `
            <div style="
                width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                background:#dc2626;border:2.5px solid white;box-shadow:0 3px 8px rgba(220,38,38,0.5);
            "></div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
    });
}

function meIcon(): L.DivIcon {
    return L.divIcon({
        html: `
            <div style="position:relative;width:18px;height:18px;">
                <div style="position:absolute;inset:-9px;border-radius:50%;background:rgba(37,99,235,0.3);"></div>
                <div style="position:absolute;inset:0;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
            </div>`,
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
}

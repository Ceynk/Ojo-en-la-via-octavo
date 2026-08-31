import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Report, ReportStatus } from '@/types';
import { getIncidentTypeStyle, type IncidentTypeStyle } from '@/lib/incidentTypeStyle';

// Villavicencio, Colombia
const DEFAULT_CENTER: [number, number] = [4.142, -73.6266];
const DEFAULT_ZOOM = 13;

const STATUS_RING_COLORS: Record<ReportStatus, string> = {
    pendiente: '#f59e0b',
    notificado: '#8b5cf6',
    en_camino: '#0ea5e9',
    en_revision: '#3b82f6',
    en_proceso: '#f97316',
    resuelto: '#10b981',
};

// Leaflet markers/popups are raw HTML strings, not React trees — render the Lucide icon
// to a static SVG string once so it can be embedded like any other markup.
function iconSvg(Icon: IncidentTypeStyle['Icon'], props: { size?: number; color?: string; strokeWidth?: number } = {}): string {
    return renderToStaticMarkup(
        createElement(Icon, { size: props.size ?? 14, color: props.color ?? 'currentColor', strokeWidth: props.strokeWidth ?? 2.25 }),
    );
}

function reportIcon(report: Report): L.DivIcon {
    const { color, Icon } = getIncidentTypeStyle(report.incident_type);
    const ring = STATUS_RING_COLORS[report.status] ?? '#94a3b8';
    return L.divIcon({
        html: `
            <div style="
                width:28px;height:28px;border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                background:${color};
                border:2.5px solid ${ring};
                box-shadow:0 1px 4px rgba(0,0,0,0.4);
                display:flex;align-items:center;justify-content:center;
            ">
                <span style="transform:rotate(45deg);display:flex;color:#fff">${iconSvg(Icon, { size: 14 })}</span>
            </div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -26],
    });
}

function selectedIcon(): L.DivIcon {
    // Teardrop pin — deliberately different from the round "you are here" dot so the two
    // never look like duplicates of the same marker.
    return L.divIcon({
        html: `
            <div style="
                width:30px;height:30px;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                background:#2563eb;
                border:2.5px solid white;
                box-shadow:0 3px 8px rgba(37,99,235,0.5);
                display:flex;align-items:center;justify-content:center;
            ">
                <div style="width:9px;height:9px;border-radius:50%;background:white;transform:rotate(45deg)"></div>
            </div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
    });
}

function myLocationIcon(): L.DivIcon {
    return L.divIcon({
        html: `
            <div style="position:relative;width:18px;height:18px;">
                <div class="my-location-pulse" style="position:absolute;inset:-9px;border-radius:50%;background:rgba(37,99,235,0.3);"></div>
                <div style="position:absolute;inset:0;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
            </div>`,
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
}

interface MapViewProps {
    reports: Report[];
    selectedCoords?: { lat: number; lng: number } | null;
    userLocation?: { lat: number; lng: number } | null;
    radiusKm?: number | null;
    onMapClick?: (lat: number, lng: number) => void;
    onReportClick?: (reportId: number) => void;
    className?: string;
}

export interface MapViewHandle {
    getCenter: () => { lat: number; lng: number };
    flyTo: (lat: number, lng: number, zoom?: number) => void;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
    { reports, selectedCoords, userLocation, radiusKm, onMapClick, onReportClick, className },
    ref,
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
    const selectedMarkerRef = useRef<L.Marker | null>(null);
    const myLocationMarkerRef = useRef<L.Marker | null>(null);
    const radiusCircleRef = useRef<L.Circle | null>(null);
    const radiusPulseRef = useRef<L.Circle | null>(null);
    const radiusAnimRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
        getCenter: () => {
            const center = mapRef.current?.getCenter() ?? { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
            return { lat: center.lat, lng: center.lng };
        },
        flyTo: (lat, lng, zoom = 16) => {
            mapRef.current?.flyTo([lat, lng], zoom, { duration: 1 });
        },
    }));

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        // Own corner, away from the zoom control and the FAB, and clear of the locate button.
        L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

        map.on('click', (e) => {
            onMapClick?.(e.latlng.lat, e.latlng.lng);
        });

        markersLayerRef.current = L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            maxClusterRadius: 50,
        });
        map.addLayer(markersLayerRef.current);
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            markersLayerRef.current = null;
        };
        // onMapClick intentionally excluded — stable enough for this use-case
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update markers when reports change
    useEffect(() => {
        const layer = markersLayerRef.current;
        if (!layer) return;

        layer.clearLayers();

        reports.forEach((report) => {
            const marker = L.marker([report.latitude, report.longitude], {
                icon: reportIcon(report),
            });
            marker.on('click', () => onReportClick?.(report.id));
            layer.addLayer(marker);
        });
    }, [reports, onReportClick]);

    // Update selected location marker
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (selectedMarkerRef.current) {
            selectedMarkerRef.current.remove();
            selectedMarkerRef.current = null;
        }

        if (selectedCoords) {
            const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
                icon: selectedIcon(),
            }).addTo(map);
            selectedMarkerRef.current = marker;
            map.setView([selectedCoords.lat, selectedCoords.lng], 16, { animate: true });
        }
    }, [selectedCoords]);

    // Live "you are here" marker — always visible, never recenters the map
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (!userLocation) {
            myLocationMarkerRef.current?.remove();
            myLocationMarkerRef.current = null;
            return;
        }

        if (myLocationMarkerRef.current) {
            myLocationMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        } else {
            myLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
                icon: myLocationIcon(),
                interactive: false,
                zIndexOffset: -100,
            }).addTo(map);
        }
    }, [userLocation]);

    // Search-radius circle around the user, with a looping "radar" pulse so it reads as a
    // live scan rather than a static shape — makes it obvious what area is being searched.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        function stopAnimation() {
            if (radiusAnimRef.current !== null) {
                cancelAnimationFrame(radiusAnimRef.current);
                radiusAnimRef.current = null;
            }
        }

        if (!userLocation || !radiusKm) {
            radiusCircleRef.current?.remove();
            radiusCircleRef.current = null;
            radiusPulseRef.current?.remove();
            radiusPulseRef.current = null;
            stopAnimation();
            return;
        }

        const center: L.LatLngExpression = [userLocation.lat, userLocation.lng];
        const radiusMeters = radiusKm * 1000;

        if (radiusCircleRef.current) {
            radiusCircleRef.current.setLatLng(center).setRadius(radiusMeters);
        } else {
            radiusCircleRef.current = L.circle(center, {
                radius: radiusMeters,
                color: '#3b82f6',
                weight: 1.5,
                dashArray: '6 6',
                fillColor: '#3b82f6',
                fillOpacity: 0.05,
                interactive: false,
            }).addTo(map);
        }

        if (!radiusPulseRef.current) {
            radiusPulseRef.current = L.circle(center, {
                radius: 0,
                color: '#60a5fa',
                weight: 2,
                fillColor: '#60a5fa',
                fillOpacity: 0.12,
                interactive: false,
                className: 'radius-pulse-ring',
            }).addTo(map);
        }

        const pulse = radiusPulseRef.current;
        const DURATION = 2600;
        let start: number | null = null;

        function step(timestamp: number) {
            if (start === null) start = timestamp;
            const t = ((timestamp - start) % DURATION) / DURATION;
            pulse!.setLatLng(center).setRadius(radiusMeters * t);
            pulse!.setStyle({ opacity: 0.7 * (1 - t), fillOpacity: 0.12 * (1 - t) });
            radiusAnimRef.current = requestAnimationFrame(step);
        }

        stopAnimation();
        radiusAnimRef.current = requestAnimationFrame(step);

        return stopAnimation;
    }, [userLocation, radiusKm]);

    return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
});

export default MapView;

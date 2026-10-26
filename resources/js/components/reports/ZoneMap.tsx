import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface ZoneStat {
    lat: number;
    lng: number;
    total: number;
    resolved: number;
    open: number;
    by_status: Record<string, number>;
    top_type: string;
    reference: string;
}

/**
 * RF-32 — incident density by zone. One circle per grid cell (see
 * AdminAnalyticsController::zones): size = number of reports, color = share still open
 * (red = mostly unresolved, green = mostly resolved).
 */
export default function ZoneMap({ zones }: { zones: ZoneStat[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const layerRef = useRef<L.LayerGroup | null>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([4.142, -73.6266], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);
        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        const layer = layerRef.current;
        if (!map || !layer) return;

        layer.clearLayers();
        if (zones.length === 0) return;

        const max = Math.max(...zones.map((z) => z.total));
        for (const z of zones) {
            const openShare = z.total ? z.open / z.total : 0;
            // Interpolate green (resolved) → red (open).
            const color = `hsl(${Math.round(140 - openShare * 140)}, 75%, 50%)`;
            L.circleMarker([z.lat, z.lng], {
                radius: 8 + (z.total / max) * 22,
                color,
                fillColor: color,
                fillOpacity: 0.45,
                weight: 2,
            })
                .bindPopup(
                    `<strong>${z.total} reporte${z.total === 1 ? '' : 's'}</strong><br/>` +
                        `${z.open} abiertos · ${z.resolved} resueltos<br/>` +
                        `Más frecuente: ${escapeHtml(z.top_type)}<br/>` +
                        `<span style="opacity:.7">Ej.: ${escapeHtml(z.reference)}</span>`,
                )
                .addTo(layer);
        }
        map.fitBounds(L.latLngBounds(zones.map((z) => [z.lat, z.lng] as [number, number])).pad(0.3), { maxZoom: 15 });
    }, [zones]);

    return <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-lg" />;
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Report, ReportStatus } from '@/types';
import { STATUS_LABELS, getStorageUrl, truncate } from '@/lib/utils';

// Villavicencio, Colombia
const DEFAULT_CENTER: [number, number] = [4.142, -73.6266];
const DEFAULT_ZOOM = 13;

const MARKER_COLORS: Record<ReportStatus, string> = {
    pendiente: '#f59e0b',
    en_revision: '#3b82f6',
    notificado: '#8b5cf6',
    resuelto: '#10b981',
};

function statusIcon(status: ReportStatus): L.DivIcon {
    const color = MARKER_COLORS[status] ?? '#94a3b8';
    return L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -12],
    });
}

function selectedIcon(): L.DivIcon {
    return L.divIcon({
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,0.6)"></div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
}

function popupContent(report: Report): string {
    const image = report.images?.[0];
    const statusColor =
        report.status === 'pendiente' ? '#d97706' :
        report.status === 'en_revision' ? '#1d4ed8' :
        report.status === 'notificado' ? '#7c3aed' : '#059669';
    const statusBg =
        report.status === 'pendiente' ? '#fef3c7' :
        report.status === 'en_revision' ? '#dbeafe' :
        report.status === 'notificado' ? '#ede9fe' : '#d1fae5';

    return `
        <div style="min-width:210px;max-width:250px;font-family:Inter,sans-serif;line-height:1.4">
            ${image ? `<img src="${getStorageUrl(image.path)}" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block" />` : ''}
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
                <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:9999px;background:${statusBg};color:${statusColor}">
                    ${STATUS_LABELS[report.status]}
                </span>
                ${report.incident_type ? `<span style="font-size:10px;color:#64748b">${report.incident_type.name}</span>` : ''}
            </div>
            <p style="font-size:12px;color:#1e293b;margin:0 0 4px;font-weight:500">${truncate(report.description, 90)}</p>
            ${report.address_text ? `<p style="font-size:10px;color:#94a3b8;margin:0">${truncate(report.address_text, 50)}</p>` : ''}
            <p style="font-size:10px;color:#cbd5e1;margin:4px 0 0">Por ${report.user?.name ?? 'Usuario'}</p>
            <button data-report-id="${report.id}" style="margin-top:8px;width:100%;padding:5px 0;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer">
                Ver comentarios
            </button>
        </div>
    `;
}

interface MapViewProps {
    reports: Report[];
    selectedCoords?: { lat: number; lng: number } | null;
    onMapClick?: (lat: number, lng: number) => void;
    onReportClick?: (reportId: number) => void;
    className?: string;
}

export default function MapView({ reports, selectedCoords, onMapClick, onReportClick, className }: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const selectedMarkerRef = useRef<L.Marker | null>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, { zoomControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        map.on('click', (e) => {
            onMapClick?.(e.latlng.lat, e.latlng.lng);
        });

        map.on('popupopen', (e) => {
            const btn = e.popup.getElement()?.querySelector<HTMLButtonElement>('[data-report-id]');
            if (btn) {
                btn.onclick = () => onReportClick?.(Number(btn.dataset.reportId));
            }
        });

        markersLayerRef.current = L.layerGroup().addTo(map);
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
                icon: statusIcon(report.status),
            });
            marker.bindPopup(popupContent(report), { maxWidth: 260 });
            layer.addLayer(marker);
        });
    }, [reports]);

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

    return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
}

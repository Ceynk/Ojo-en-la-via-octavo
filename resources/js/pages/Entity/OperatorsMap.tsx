import { useEffect, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EntityLayout from '@/components/shared/EntityLayout';
import { usePrivateChannel } from '@/hooks/useEcho';
import type { Entity, PageProps } from '@/types';

interface OperatorLocationPayload {
    operator_id: number;
    name: string;
    latitude: number;
    longitude: number;
    updated_at: string;
}

interface EntityOperatorsMapProps extends PageProps {
    entity: Pick<Entity, 'id' | 'name'>;
}

// Villavicencio, Colombia — same default used by MapView.tsx
const DEFAULT_CENTER: [number, number] = [4.142, -73.6266];
const STALE_AFTER_MS = 2 * 60 * 1000;

export default function EntityOperatorsMap() {
    const { entity } = usePage<EntityOperatorsMapProps>().props;

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<Map<number, { marker: L.Marker; updatedAt: number }>>(new Map());

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current).setView(DEFAULT_CENTER, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
        }).addTo(map);
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Prune markers that haven't reported in a while, so a closed app doesn't leave a ghost pin
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            for (const [id, { marker, updatedAt }] of markersRef.current) {
                if (now - updatedAt > STALE_AFTER_MS) {
                    marker.remove();
                    markersRef.current.delete(id);
                }
            }
        }, 30_000);
        return () => clearInterval(interval);
    }, []);

    usePrivateChannel(`entity.${entity.id}.operators`, 'operator.location.updated', (raw) => {
        const data = raw as OperatorLocationPayload;
        const map = mapRef.current;
        if (!map) return;

        const existing = markersRef.current.get(data.operator_id);
        if (existing) {
            existing.marker.setLatLng([data.latitude, data.longitude]);
            existing.updatedAt = Date.now();
        } else {
            const marker = L.marker([data.latitude, data.longitude], { icon: operatorIcon() })
                .addTo(map)
                .bindPopup(data.name);
            markersRef.current.set(data.operator_id, { marker, updatedAt: Date.now() });
        }
    });

    return (
        <EntityLayout entityName={entity.name} breadcrumb="Mapa en vivo de operadores">
            <Head title="Mapa en vivo" />

            <div className="space-y-3">
                <p className="text-xs text-muted">
                    Se actualiza en tiempo real mientras tus operadores tienen la navegación abierta. Un punto desaparece si no reporta ubicación por más de 2 minutos.
                </p>
                <div className="overflow-hidden rounded-xl border border-default shadow-[var(--shadow-card)]">
                    <div ref={mapContainerRef} className="h-[540px] w-full" />
                </div>
            </div>
        </EntityLayout>
    );
}

function operatorIcon(): L.DivIcon {
    return L.divIcon({
        html: `
            <div style="position:relative;width:22px;height:22px;">
                <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(37,99,235,0.25);"></div>
                <div style="position:absolute;inset:0;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
            </div>`,
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
    });
}

import type { LucideIcon } from 'lucide-react';
import {
    CircleDot,
    Droplets,
    Mountain,
    Lightbulb,
    Construction,
    Signpost,
    TreeDeciduous,
    TriangleAlert,
    CircleHelp,
    MapPin,
} from 'lucide-react';
import TrafficLightIcon from '@/components/icons/TrafficLightIcon';
import type { IncidentType } from '@/types';

// Deterministic color palette, cycled by incident_type id — stable regardless of insertion order.
const PALETTE = [
    '#ef4444', // rojo
    '#3b82f6', // azul
    '#f59e0b', // ámbar
    '#8b5cf6', // violeta
    '#10b981', // esmeralda
    '#ec4899', // rosa
    '#06b6d4', // cian
    '#84cc16', // lima
    '#f97316', // naranja
    '#6366f1', // índigo
];

// Icon per known incident type name — falls back to a generic pin marker.
const ICON_BY_NAME: Record<string, LucideIcon> = {
    'Bache': CircleDot,
    'Inundación': Droplets,
    'Derrumbe': Mountain,
    'Semáforo dañado': TrafficLightIcon as unknown as LucideIcon,
    'Alumbrado público': Lightbulb,
    'Escombros en vía': Construction,
    'Señalización deteriorada': Signpost,
    'Árbol caído': TreeDeciduous,
    'Hundimiento': TriangleAlert,
    'Otro': CircleHelp,
};

const DEFAULT_ICON = MapPin;

export interface IncidentTypeStyle {
    color: string;
    Icon: LucideIcon;
}

export function getIncidentTypeStyle(type: IncidentType | null | undefined): IncidentTypeStyle {
    if (!type) {
        return { color: '#64748b', Icon: DEFAULT_ICON };
    }
    return {
        color: PALETTE[type.id % PALETTE.length],
        Icon: ICON_BY_NAME[type.name] ?? DEFAULT_ICON,
    };
}

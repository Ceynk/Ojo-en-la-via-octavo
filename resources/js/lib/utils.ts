import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Comment, DocumentType, Gender, ReportStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    if (diffDays < 7) return `hace ${diffDays} días`;

    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: diffDays > 365 ? 'numeric' : undefined,
    });
}

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
    pendiente: 'Pendiente',
    notificado: 'Notificado',
    en_camino: 'En camino',
    en_revision: 'En revisión',
    en_proceso: 'En proceso',
    resuelto: 'Resuelto',
};

/**
 * "Notificado" reads fine to admins/ciudadanos (notified *to the entity*), but from
 * inside the entity's own panel it's confusing — notified to whom? Swap just that
 * label for entity-facing views; everything else matches STATUS_LABELS.
 */
export const ENTITY_STATUS_LABELS: Record<ReportStatus, string> = {
    ...STATUS_LABELS,
    notificado: 'Por revisar',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
    pendiente: 'status-pendiente',
    notificado: 'status-notificado',
    en_camino: 'status-en_camino',
    en_revision: 'status-en_revision',
    en_proceso: 'status-en_proceso',
    resuelto: 'status-resuelto',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    CC: 'Cédula de ciudadanía',
    TI: 'Tarjeta de identidad',
    CE: 'Cédula de extranjería',
    PA: 'Pasaporte',
};

export const GENDER_LABELS: Record<Gender, string> = {
    masculino: 'Masculino',
    femenino: 'Femenino',
    otro: 'Otro',
    prefiero_no_decir: 'Prefiero no decir',
};

export function getStorageUrl(path: string): string {
    return `/storage/${path}`;
}

/** Puts admin and entity comments first (stable — preserves relative order otherwise),
 * since those are treated as important enough to surface ahead of the rest. */
export function sortCommentsByPriority(comments: Comment[]): Comment[] {
    const priority = (c: Comment) => (c.user?.role === 'admin' || c.user?.role === 'entity' ? 0 : 1);
    return [...comments].sort((a, b) => priority(a) - priority(b));
}

export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return `${str.slice(0, maxLength).trim()}…`;
}

/** Great-circle distance between two coordinates, in kilometers. */
export function haversineDistanceKm(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
): number {
    const R = 6371;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((from.lat * Math.PI) / 180) *
            Math.cos((to.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Same great-circle formula as haversineDistanceKm, in meters — for the operator's geofence check. */
export function distanceInMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
    return haversineDistanceKm(from, to) * 1000;
}

export function formatDistanceKm(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
}

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ReportStatus } from '@/types';

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
    en_revision: 'En revisión',
    notificado: 'Notificado',
    resuelto: 'Resuelto',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
    pendiente: 'status-pendiente',
    en_revision: 'status-en_revision',
    notificado: 'status-notificado',
    resuelto: 'status-resuelto',
};

export function getStorageUrl(path: string): string {
    return `/storage/${path}`;
}

export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return `${str.slice(0, maxLength).trim()}…`;
}

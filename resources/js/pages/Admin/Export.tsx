import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Download, FileText, Filter, Calendar, Tag,
    CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import { cn } from '@/lib/utils';
import type { PageProps, ReportStatus } from '@/types';

interface ExportProps extends PageProps {
    total_reports: number;
}

const STATUS_OPTIONS: { value: ReportStatus | ''; label: string }[] = [
    { value: '',           label: 'Todos los estados' },
    { value: 'pendiente',  label: 'Pendiente' },
    { value: 'notificado', label: 'Notificado' },
    { value: 'en_camino',  label: 'En camino' },
    { value: 'en_revision',label: 'En revisión' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'resuelto',   label: 'Resuelto' },
];

type DownloadState = 'idle' | 'loading' | 'done' | 'error';

export default function Export() {
    const { total_reports } = usePage<ExportProps>().props;

    const [from, setFrom]     = useState('');
    const [to, setTo]         = useState('');
    const [status, setStatus] = useState<ReportStatus | ''>('');
    const [dlState, setDlState] = useState<DownloadState>('idle');

    function buildUrl() {
        const params = new URLSearchParams();
        if (from)   params.set('from', from);
        if (to)     params.set('to', to);
        if (status) params.set('status', status);
        const qs = params.toString();
        return `/admin/export/download${qs ? `?${qs}` : ''}`;
    }

    async function handleDownload() {
        setDlState('loading');
        try {
            const res = await fetch(buildUrl(), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!res.ok) throw new Error('Error en la descarga');

            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href     = url;
            a.download = `reportes_${date}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            setDlState('done');
            setTimeout(() => setDlState('idle'), 3000);
        } catch {
            setDlState('error');
            setTimeout(() => setDlState('idle'), 4000);
        }
    }

    const hasFilters = !!from || !!to || !!status;

    return (
        <AdminLayout
            title="Exportar datos"
            breadcrumbs={[{ label: 'Exportar' }]}
        >
            <Head title="Exportar — Admin" />

            <div className="mx-auto max-w-2xl space-y-5">

                {/* Header card */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 rounded-xl border border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]"
                >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40">
                        <FileText className="h-6 w-6 text-brand-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-primary">Exportar reportes a CSV</h2>
                        <p className="text-xs text-muted">
                            {total_reports.toLocaleString('es-CO')} reportes disponibles en el sistema
                        </p>
                    </div>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                    className="rounded-xl border border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]"
                >
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                        <Filter className="h-4 w-4 text-muted" />
                        Filtros opcionales
                    </h3>

                    <div className="space-y-4">
                        {/* Date range */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-secondary">
                                    <Calendar className="h-3.5 w-3.5 text-muted" />
                                    Desde
                                </label>
                                <input
                                    type="date"
                                    value={from}
                                    max={to || undefined}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="w-full rounded-lg border border-default bg-surface-secondary py-2 px-3 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-secondary">
                                    <Calendar className="h-3.5 w-3.5 text-muted" />
                                    Hasta
                                </label>
                                <input
                                    type="date"
                                    value={to}
                                    min={from || undefined}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="w-full rounded-lg border border-default bg-surface-secondary py-2 px-3 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Status filter */}
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-secondary">
                                <Tag className="h-3.5 w-3.5 text-muted" />
                                Estado
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as ReportStatus | '')}
                                className="w-full rounded-lg border border-default bg-surface-secondary py-2 pl-3 pr-8 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                            >
                                {STATUS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value} className="bg-white text-gray-900">{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Active filters summary */}
                        {hasFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-tertiary px-3 py-2"
                            >
                                <span className="text-xs text-muted">Filtros activos:</span>
                                {from && (
                                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                        Desde {from}
                                    </span>
                                )}
                                {to && (
                                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                        Hasta {to}
                                    </span>
                                )}
                                {status && (
                                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                        {STATUS_OPTIONS.find((o) => o.value === status)?.label}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setFrom(''); setTo(''); setStatus(''); }}
                                    className="ml-auto text-[11px] text-muted underline hover:text-secondary"
                                >
                                    Limpiar
                                </button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* CSV format info */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    className="rounded-xl border border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]"
                >
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                        Columnas incluidas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {['ID', 'Tipo', 'Descripción', 'Estado', 'Dirección', 'Latitud', 'Longitud', 'Usuario', 'Email', 'Fecha'].map((col) => (
                            <span
                                key={col}
                                className="rounded-md bg-surface-tertiary px-2 py-1 font-mono text-[11px] text-secondary"
                            >
                                {col}
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-muted">
                        El archivo se descarga en formato CSV con codificación UTF-8, compatible con Excel y Google Sheets.
                    </p>
                </motion.div>

                {/* Download button */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 }}
                >
                    <button
                        onClick={handleDownload}
                        disabled={dlState === 'loading'}
                        className={cn(
                            'flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-semibold transition-all',
                            dlState === 'done'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : dlState === 'error'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.99]',
                            dlState === 'loading' && 'cursor-not-allowed opacity-80',
                        )}
                    >
                        {dlState === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {dlState === 'done'    && <CheckCircle2 className="h-4 w-4" />}
                        {dlState === 'error'   && <AlertCircle className="h-4 w-4" />}
                        {dlState === 'idle'    && <Download className="h-4 w-4" />}

                        {dlState === 'idle'    && 'Descargar CSV'}
                        {dlState === 'loading' && 'Preparando descarga…'}
                        {dlState === 'done'    && '¡Descargado correctamente!'}
                        {dlState === 'error'   && 'Error al descargar — reintentar'}
                    </button>
                </motion.div>

            </div>
        </AdminLayout>
    );
}

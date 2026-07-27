import { Head, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { MapPin, AlertTriangle, CheckCircle2, RefreshCw, Clock } from 'lucide-react';
import { cn, STATUS_LABELS, STATUS_COLORS, formatRelativeTime } from '@/lib/utils';
import type { Report, ReportStatus } from '@/types';

interface UpdateProps {
    token: string;
    report: Report;
}

const STATUS_OPTIONS: { value: ReportStatus; label: string; description: string }[] = [
    {
        value: 'en_revision',
        label: 'En revisión',
        description: 'El caso ha sido recibido y está siendo analizado.',
    },
    {
        value: 'resuelto',
        label: 'Resuelto',
        description: 'El problema ha sido atendido y solucionado.',
    },
];

export default function EntityUpdate({ token, report }: UpdateProps) {
    const { data, setData, post, processing, errors, wasSuccessful } = useForm({
        status: '' as ReportStatus | '',
        notes:  '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/entidad/actualizar/${token}`);
    }

    return (
        <div className="min-h-screen bg-surface-secondary">
            <Head title="Actualizar reporte — Ojo en la Vía" />

            {/* Header */}
            <header className="border-b border-default bg-surface-primary">
                <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                        <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-primary">Ojo en la Vía</p>
                        <p className="text-xs text-muted">Portal de entidades</p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
                {/* Report info card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]"
                >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs font-medium text-secondary">
                            {report.incident_type?.name ?? 'Incidente'}
                        </span>
                        <span className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            STATUS_COLORS[report.status],
                        )}>
                            {STATUS_LABELS[report.status]}
                        </span>
                        <span className="ml-auto text-xs text-muted">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {formatRelativeTime(report.created_at)}
                        </span>
                    </div>

                    <p className="text-sm leading-relaxed text-primary">{report.description}</p>

                    {report.address_text && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-secondary">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                            <span>{report.address_text}</span>
                        </div>
                    )}
                </motion.div>

                {/* Action form */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="rounded-xl border border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]"
                >
                    <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
                        <RefreshCw className="h-4 w-4 text-muted" />
                        Actualizar estado del reporte
                    </h2>
                    <p className="mb-4 text-xs text-muted">
                        Selecciona el nuevo estado y opcionalmente agrega notas sobre las acciones tomadas.
                    </p>

                    <form onSubmit={submit} className="space-y-4">
                        {/* Status options */}
                        <div className="space-y-2">
                            {STATUS_OPTIONS.map((opt) => (
                                <label
                                    key={opt.value}
                                    className={cn(
                                        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all',
                                        data.status === opt.value
                                            ? 'border-brand-500 bg-brand-50/50 dark:border-brand-600 dark:bg-brand-950/30'
                                            : 'border-default hover:border-brand-300 hover:bg-surface-secondary dark:hover:border-brand-700',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value={opt.value}
                                        checked={data.status === opt.value}
                                        onChange={() => setData('status', opt.value)}
                                        className="mt-0.5 accent-brand-600"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-primary">{opt.label}</p>
                                        <p className="text-xs text-muted">{opt.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                        {errors.status && (
                            <p className="text-xs text-red-600">{errors.status}</p>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-secondary">
                                Notas <span className="text-muted">(opcional)</span>
                            </label>
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                maxLength={500}
                                placeholder="Describe las acciones tomadas para resolver el incidente…"
                                className="w-full resize-none rounded-lg border border-default bg-surface-secondary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                            />
                            {errors.notes && (
                                <p className="mt-1 text-xs text-red-600">{errors.notes}</p>
                            )}
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                Este enlace es de un solo uso. Una vez enviado, ya no podrás realizar cambios adicionales a través de este enlace.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={processing || !data.status}
                            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing ? 'Enviando…' : 'Confirmar actualización'}
                        </button>
                    </form>
                </motion.div>

                <p className="text-center text-xs text-muted">
                    Plataforma ciudadana Ojo en la Vía · Villavicencio
                </p>
            </main>
        </div>
    );
}

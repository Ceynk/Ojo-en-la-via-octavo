import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUpload, CloudOff, AlertTriangle, Trash2 } from 'lucide-react';
import { discardQueuedReport, type QueuedReport } from '@/lib/offlineReports';
import { cn } from '@/lib/utils';

interface OfflineQueueIndicatorProps {
    items: QueuedReport[];
}

/**
 * Header chip that only exists while there are reports waiting on the device. Kept
 * deliberately quiet: the citizen's report already "went through" from their point of
 * view, this is just a way to see it's still on its way.
 */
export default function OfflineQueueIndicator({ items }: OfflineQueueIndicatorProps) {
    const [open, setOpen] = useState(false);
    const [online, setOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    useEffect(() => {
        if (items.length === 0) setOpen(false);
    }, [items.length]);

    if (items.length === 0) return null;

    const rejected = items.filter((i) => i.rejected_reason);
    const Icon = rejected.length > 0 ? AlertTriangle : online ? CloudUpload : CloudOff;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-tertiary',
                    rejected.length > 0 ? 'text-amber-400' : 'text-muted hover:text-primary',
                )}
                aria-label="Reportes pendientes de envío"
                title="Reportes pendientes de envío"
            >
                <Icon className={cn('h-4 w-4', online && rejected.length === 0 && 'animate-pulse')} />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-600 text-[10px] font-bold text-white">
                    {items.length}
                </span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-11 w-72 overflow-hidden rounded-xl border border-white/10 bg-slate-900/90 shadow-[var(--shadow-elevated)] backdrop-blur-md"
                    >
                        <div className="border-b border-white/10 px-4 py-3">
                            <p className="text-sm font-semibold text-white">Pendientes de envío</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                {online
                                    ? 'Enviando tus reportes…'
                                    : 'Se enviarán solos cuando vuelva la señal.'}
                            </p>
                        </div>
                        <ul className="max-h-72 divide-y divide-white/5 overflow-y-auto">
                            {items.map((item) => (
                                <li key={item.client_uuid} className="flex items-start gap-2 px-4 py-2.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs text-slate-200">{item.description}</p>
                                        {item.rejected_reason ? (
                                            <p className="mt-0.5 text-[11px] text-amber-400">
                                                No se pudo enviar: {item.rejected_reason}
                                            </p>
                                        ) : (
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                {new Date(item.created_at).toLocaleString('es-CO', {
                                                    dateStyle: 'short',
                                                    timeStyle: 'short',
                                                })}
                                            </p>
                                        )}
                                    </div>
                                    {item.rejected_reason && (
                                        <button
                                            type="button"
                                            onClick={() => discardQueuedReport(item.client_uuid)}
                                            className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-red-400"
                                            title="Descartar"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

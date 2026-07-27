import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { MapPin, LinkIcon, CheckCircle2 } from 'lucide-react';

export default function InvalidToken() {
    return (
        <div className="min-h-screen bg-surface-secondary">
            <Head title="Enlace no válido — Ojo en la Vía" />

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

            <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    className="space-y-6"
                >
                    {/* Icon */}
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface-secondary">
                        <LinkIcon className="h-9 w-9 text-muted" />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-primary">
                            Enlace no válido
                        </h1>
                        <p className="text-sm leading-relaxed text-secondary">
                            Este enlace ya fue utilizado o ha expirado.
                            Solo puede usarse una vez para actualizar el estado del reporte.
                        </p>
                    </div>

                    {/* Success hint */}
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-800 dark:bg-emerald-950/20">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <div>
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                                ¿Ya actualizaste el reporte?
                            </p>
                            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                                Si ya enviaste la actualización, el cambio fue registrado correctamente
                                y el ciudadano fue notificado.
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-muted">
                        Si crees que esto es un error, contacta al equipo de Ojo en la Vía.
                    </p>
                </motion.div>
            </main>
        </div>
    );
}

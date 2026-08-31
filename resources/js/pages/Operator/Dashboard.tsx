import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Loader2, Inbox, ListChecks } from 'lucide-react';
import OperatorLayout from '@/components/shared/OperatorLayout';
import StatusBadge from '@/components/reports/StatusBadge';
import { FlashMessages } from '@/components/ui/alert';
import { cn, formatRelativeTime, ENTITY_STATUS_LABELS } from '@/lib/utils';
import type { PageProps, Report } from '@/types';

interface OperatorDashboardProps extends PageProps {
    available: Report[];
    mine: Report[];
}

export default function OperatorDashboard() {
    const { available, mine } = usePage<OperatorDashboardProps>().props;
    const [claimingId, setClaimingId] = useState<number | null>(null);

    function claim(report: Report) {
        if (claimingId) return;
        setClaimingId(report.id);
        router.post(`/operador/reportes/${report.id}/tomar`, {}, {
            onFinish: () => setClaimingId(null),
        });
    }

    return (
        <OperatorLayout breadcrumb="Cola de reportes">
            <Head title="Cola de reportes" />

            <div className="space-y-6">
                <FlashMessages />

                <section>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <ListChecks className="h-4 w-4 text-muted" />
                        En curso ({mine.length})
                    </h2>
                    {mine.length === 0 ? (
                        <EmptyState text="No tienes reportes en curso." />
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {mine.map((report) => (
                                <ReportCard key={report.id} report={report}>
                                    <button
                                        onClick={() => router.visit(`/operador/reportes/${report.id}`)}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700"
                                    >
                                        <Navigation className="h-3.5 w-3.5" />
                                        Continuar
                                    </button>
                                </ReportCard>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <Inbox className="h-4 w-4 text-muted" />
                        Disponibles ({available.length})
                    </h2>
                    {available.length === 0 ? (
                        <EmptyState text="No hay reportes disponibles en este momento." />
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {available.map((report) => (
                                <ReportCard key={report.id} report={report}>
                                    <button
                                        onClick={() => claim(report)}
                                        disabled={claimingId === report.id}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-default px-3 py-2 text-xs font-medium text-secondary transition-colors hover:bg-surface-tertiary hover:text-primary disabled:opacity-50"
                                    >
                                        {claimingId === report.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <MapPin className="h-3.5 w-3.5" />
                                        )}
                                        Tomar reporte
                                    </button>
                                </ReportCard>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </OperatorLayout>
    );
}

function ReportCard({ report, children }: { report: Report; children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 rounded-xl border border-default bg-surface-primary p-4 shadow-[var(--shadow-card)]"
        >
            <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-secondary">
                    {report.incident_type?.name ?? '—'}
                </span>
                <StatusBadge status={report.status} labelOverride={ENTITY_STATUS_LABELS[report.status]} />
            </div>
            <p className="text-sm text-primary line-clamp-2">{report.description}</p>
            <p className="flex items-center gap-1 text-xs text-muted">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{report.address_text}</span>
            </p>
            <p className="text-[11px] text-muted">{formatRelativeTime(report.created_at)}</p>
            {children}
        </motion.div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-default py-10 text-center',
        )}>
            <Inbox className="h-8 w-8 text-muted opacity-40" />
            <p className="text-sm text-muted">{text}</p>
        </div>
    );
}

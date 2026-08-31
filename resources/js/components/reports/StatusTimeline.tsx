import { CheckCircle2, Circle } from 'lucide-react';
import { cn, formatDateTime, STATUS_LABELS } from '@/lib/utils';
import type { Report, ReportStatus } from '@/types';

const STATUS_ORDER: ReportStatus[] = ['pendiente', 'notificado', 'en_camino', 'en_revision', 'en_proceso', 'resuelto'];

interface Step {
    status: ReportStatus;
    reached: boolean;
    current: boolean;
    date: string | null;
    actor: string | null;
}

function buildSteps(report: Report): Step[] {
    const currentIndex = STATUS_ORDER.indexOf(report.status);
    // Backend returns statusHistory latest-first; reverse for chronological order.
    const history = [...(report.status_history ?? [])].reverse();

    return STATUS_ORDER.map((status, index) => {
        if (index === 0) {
            return {
                status,
                reached: index <= currentIndex,
                current: index === currentIndex,
                date: report.created_at,
                actor: report.user?.name ? `Reportado por ${report.user.name}` : null,
            };
        }

        const entry = history.find((h) => h.new_status === status);
        return {
            status,
            reached: index <= currentIndex,
            current: index === currentIndex,
            date: entry?.created_at ?? null,
            actor: entry?.changed_by?.name ?? null,
        };
    });
}

export default function StatusTimeline({ report, labels = STATUS_LABELS }: { report: Report; labels?: Record<ReportStatus, string> }) {
    const steps = buildSteps(report);

    return (
        <div className="flex flex-col">
            {steps.map((step, i) => (
                <div key={step.status} className="flex gap-3">
                    {/* Icon + connecting line */}
                    <div className="flex flex-col items-center">
                        {step.current ? (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 ring-4 ring-brand-500/20">
                                <span className="h-2 w-2 rounded-full bg-white" />
                            </span>
                        ) : step.reached ? (
                            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                        ) : (
                            <Circle className="h-6 w-6 shrink-0 text-muted" />
                        )}
                        {i < steps.length - 1 && (
                            <span
                                className={cn(
                                    'my-1 w-px flex-1',
                                    steps[i + 1].reached ? 'bg-emerald-400/60' : 'bg-white/10',
                                )}
                            />
                        )}
                    </div>

                    {/* Label */}
                    <div className={cn('pb-6', i === steps.length - 1 && 'pb-0')}>
                        <p
                            className={cn(
                                'text-sm font-medium',
                                step.current ? 'text-brand-500' : step.reached ? 'text-primary' : 'text-muted',
                            )}
                        >
                            {labels[step.status]}
                            {step.current && (
                                <span className="ml-2 rounded-full bg-brand-600/15 px-2 py-0.5 text-[10px] font-semibold text-brand-500">
                                    Actual
                                </span>
                            )}
                        </p>
                        {step.date ? (
                            <p className="mt-0.5 text-xs text-muted">
                                {formatDateTime(step.date)}
                                {step.actor ? ` · ${step.actor}` : ''}
                            </p>
                        ) : (
                            <p className="mt-0.5 text-xs text-muted">
                                {step.reached ? 'Sin fecha registrada' : 'Aún no alcanzado'}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

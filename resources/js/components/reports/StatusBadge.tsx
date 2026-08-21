import { cn } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import type { ReportStatus } from '@/types';

interface StatusBadgeProps {
    status: ReportStatus;
    className?: string;
    labelOverride?: string;
}

export default function StatusBadge({ status, className, labelOverride }: StatusBadgeProps) {
    return (
        <span className={cn('status-badge', STATUS_COLORS[status], className)}>
            {labelOverride ?? STATUS_LABELS[status]}
        </span>
    );
}

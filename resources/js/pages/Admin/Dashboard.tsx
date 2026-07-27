import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    FileText, Clock, CheckCircle, Users, UserCheck,
    ArrowRight, Heart, MessageSquare,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import StatusBadge from '@/components/reports/StatusBadge';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import type { PageProps, Report } from '@/types';

interface DashboardStats {
    total_reports: number;
    pending_reports: number;
    resolved_reports: number;
    total_users: number;
    active_users: number;
}

interface DashboardProps extends PageProps {
    stats: DashboardStats;
    recent_reports: Report[];
}

const statCards = [
    {
        key: 'total_reports' as const,
        label: 'Total reportes',
        icon: FileText,
        color: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40 dark:text-brand-400',
        border: 'border-brand-200 dark:border-brand-800',
    },
    {
        key: 'pending_reports' as const,
        label: 'Pendientes',
        icon: Clock,
        color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
    },
    {
        key: 'resolved_reports' as const,
        label: 'Resueltos',
        icon: CheckCircle,
        color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
    },
    {
        key: 'total_users' as const,
        label: 'Ciudadanos',
        icon: Users,
        color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
        border: 'border-violet-200 dark:border-violet-800',
    },
    {
        key: 'active_users' as const,
        label: 'Activos',
        icon: UserCheck,
        color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400',
        border: 'border-teal-200 dark:border-teal-800',
    },
];

export default function Dashboard() {
    const { stats, recent_reports } = usePage<DashboardProps>().props;

    return (
        <AdminLayout title="Dashboard" breadcrumbs={[{ label: 'Dashboard' }]}>
            <Head title="Dashboard Admin" />

            <div className="space-y-6">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {statCards.map(({ key, label, icon: Icon, color, border }, i) => (
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className={cn(
                                'flex flex-col gap-3 rounded-xl border bg-surface-primary p-4',
                                'shadow-[var(--shadow-card)]',
                                border,
                            )}
                        >
                            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', color)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-primary">{stats[key].toLocaleString('es-CO')}</p>
                                <p className="text-xs text-muted">{label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Recent reports */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                >
                    <div className="flex items-center justify-between border-b border-default px-5 py-4">
                        <h2 className="text-sm font-semibold text-primary">Reportes recientes</h2>
                        <Link
                            href="/admin/reports"
                            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                        >
                            Ver todos <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-default bg-surface-secondary text-left text-xs text-muted">
                                    <th className="px-5 py-3 font-medium">Tipo</th>
                                    <th className="px-5 py-3 font-medium">Descripción</th>
                                    <th className="px-5 py-3 font-medium">Usuario</th>
                                    <th className="px-5 py-3 font-medium">Estado</th>
                                    <th className="px-5 py-3 font-medium">Fecha</th>
                                    <th className="px-5 py-3 font-medium text-center">
                                        <Heart className="inline h-3 w-3" />
                                    </th>
                                    <th className="px-5 py-3 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-default">
                                {recent_reports.map((report) => (
                                    <tr
                                        key={report.id}
                                        className="transition-colors hover:bg-surface-secondary"
                                    >
                                        <td className="whitespace-nowrap px-5 py-3">
                                            <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-secondary">
                                                {report.incident_type?.name ?? '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-secondary">
                                            {truncate(report.description, 60)}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-secondary">
                                            {report.user?.name ?? '—'}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            <StatusBadge status={report.status} />
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-muted">
                                            {formatRelativeTime(report.created_at)}
                                        </td>
                                        <td className="px-5 py-3 text-center text-muted">
                                            {report.likes_count ?? 0}
                                        </td>
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/admin/reports/${report.id}`}
                                                className="text-xs text-brand-600 hover:text-brand-700"
                                            >
                                                Ver →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {recent_reports.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">
                                            Sin reportes aún
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </AdminLayout>
    );
}

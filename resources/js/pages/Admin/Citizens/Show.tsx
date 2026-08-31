import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Mail, Phone, Calendar, UserCheck, UserX,
    FileText, MessageSquare, Heart, CheckCircle2,
    IdCard, Home, MapPin, Cake, Users as UsersIcon,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import StatusBadge from '@/components/reports/StatusBadge';
import { cn, DOCUMENT_TYPE_LABELS, formatDateTime, formatRelativeTime, GENDER_LABELS, truncate } from '@/lib/utils';
import type { PageProps, User, Report, Comment } from '@/types';

interface ShowProps extends PageProps {
    citizen: User;
    reports: Report[];
    comments: Comment[];
}

export default function CitizenShow() {
    const { citizen, reports, comments } = usePage<ShowProps>().props;

    return (
        <AdminLayout
            title={citizen.name}
            breadcrumbs={[
                { label: 'Ciudadanos', href: '/admin/citizens' },
                { label: citizen.name },
            ]}
        >
            <Head title={`${citizen.name} — Admin`} />

            <div className="space-y-5">
                <Link
                    href="/admin/citizens"
                    className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-primary"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a ciudadanos
                </Link>

                {/* Profile card */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]"
                >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                {citizen.name[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-primary">{citizen.name}</h2>
                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" /> {citizen.email}
                                    </span>
                                    {citizen.phone && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> {citizen.phone}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Registrado {formatRelativeTime(citizen.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <span className={cn(
                            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                            citizen.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        )}>
                            {citizen.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                            {citizen.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>

                    {/* Personal data */}
                    <div className="mt-5 grid gap-3 border-t border-default pt-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex items-center gap-2 text-sm text-secondary">
                            <IdCard className="h-4 w-4 shrink-0 text-muted" />
                            {citizen.document_type && citizen.document_number
                                ? `${DOCUMENT_TYPE_LABELS[citizen.document_type]} · ${citizen.document_number}`
                                : <span className="text-muted italic">Sin documento</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-secondary">
                            <Cake className="h-4 w-4 shrink-0 text-muted" />
                            {citizen.birth_date || <span className="text-muted italic">Sin fecha de nacimiento</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-secondary">
                            <UsersIcon className="h-4 w-4 shrink-0 text-muted" />
                            {citizen.gender ? GENDER_LABELS[citizen.gender] : <span className="text-muted italic">Sin género</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-secondary">
                            <Home className="h-4 w-4 shrink-0 text-muted" />
                            {citizen.address || <span className="text-muted italic">Sin dirección</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-secondary">
                            <MapPin className="h-4 w-4 shrink-0 text-muted" />
                            {citizen.neighborhood || <span className="text-muted italic">Sin barrio</span>}
                        </div>
                    </div>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        {
                            label: 'Reportes creados',
                            value: citizen.reports_count ?? 0,
                            icon: FileText,
                            color: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40',
                        },
                        {
                            label: 'Reportes resueltos',
                            value: citizen.resolved_reports_count ?? 0,
                            icon: CheckCircle2,
                            color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
                        },
                        {
                            label: 'Comentarios',
                            value: citizen.comments_count ?? 0,
                            icon: MessageSquare,
                            color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30',
                        },
                        {
                            label: 'Me gusta dados',
                            value: citizen.likes_count ?? 0,
                            icon: Heart,
                            color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
                        },
                    ].map(({ label, value, icon: Icon, color }, i) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 rounded-xl border border-default bg-surface-primary p-4 shadow-[var(--shadow-card)]"
                        >
                            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', color)}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-primary">{value}</p>
                                <p className="text-[11px] text-muted">{label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Recent reports */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                    >
                        <div className="border-b border-default px-5 py-4">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <FileText className="h-4 w-4 text-muted" />
                                Reportes recientes
                            </h3>
                        </div>
                        {reports.length > 0 ? (
                            <div className="divide-y divide-default">
                                {reports.map((r) => (
                                    <Link
                                        key={r.id}
                                        href={`/admin/reports/${r.id}`}
                                        className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-secondary"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm text-primary">{truncate(r.description, 60)}</p>
                                            <p className="mt-0.5 text-[11px] text-muted">
                                                {r.incident_type?.name ?? '—'} · {formatDateTime(r.created_at)}
                                            </p>
                                        </div>
                                        <StatusBadge status={r.status} className="shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="px-5 py-8 text-center text-sm text-muted">Sin reportes aún</p>
                        )}
                    </motion.div>

                    {/* Recent comments */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                    >
                        <div className="border-b border-default px-5 py-4">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <MessageSquare className="h-4 w-4 text-muted" />
                                Comentarios recientes
                            </h3>
                        </div>
                        {comments.length > 0 ? (
                            <div className="divide-y divide-default">
                                {comments.map((c) => (
                                    <div key={c.id} className="px-5 py-3">
                                        <p className="text-sm text-secondary">{c.body}</p>
                                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                                            <span>{formatRelativeTime(c.created_at)}</span>
                                            {c.report && (
                                                <Link
                                                    href={`/admin/reports/${c.report.id}`}
                                                    className="text-brand-600 hover:text-brand-700"
                                                >
                                                    Ver reporte
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="px-5 py-8 text-center text-sm text-muted">Sin comentarios aún</p>
                        )}
                    </motion.div>
                </div>
            </div>
        </AdminLayout>
    );
}

import { Head, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    BarChart, Bar,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, FileText, CheckCircle2, Activity } from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import { cn, STATUS_LABELS } from '@/lib/utils';
import type { PageProps, ReportStatus, User } from '@/types';

/* ── Types ────────────────────────────────────────────────────── */
interface AnalyticsData {
    reportsByType: { name: string; total: number }[];
    byStatus: Record<string, number>;
    trend: { day: string; total: number; resolved: number }[];
    activeUsers: (Pick<User, 'id' | 'name' | 'email' | 'is_active'> & { reports_count: number })[];
}

interface AnalyticsProps extends PageProps {
    data: AnalyticsData;
    days: number;
}

/* ── Palette ──────────────────────────────────────────────────── */
const TYPE_COLORS = [
    '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981',
    '#ef4444', '#06b6d4', '#f97316', '#84cc16',
];

const STATUS_PALETTE: Record<string, string> = {
    pendiente:   '#f59e0b',
    en_revision: '#3b82f6',
    notificado:  '#8b5cf6',
    resuelto:    '#10b981',
};

/* ── Custom tooltip ───────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-default bg-surface-primary px-3 py-2 shadow-lg text-xs">
            {label && <p className="mb-1 font-medium text-secondary">{label}</p>}
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-muted">{p.name}:</span>
                    <span className="font-semibold text-primary">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ── Helpers ──────────────────────────────────────────────────── */
function formatDay(day: string) {
    const d = new Date(day + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const DAY_OPTIONS = [
    { value: 7,  label: '7 días' },
    { value: 30, label: '30 días' },
    { value: 90, label: '90 días' },
];

/* ── Subcomponents ────────────────────────────────────────────── */
function ChartCard({ title, children, delay = 0 }: {
    title: string; children: React.ReactNode; delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="rounded-xl border border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]"
        >
            <h3 className="mb-4 text-sm font-semibold text-primary">{title}</h3>
            {children}
        </motion.div>
    );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function AnalyticsIndex() {
    const { data, days } = usePage<AnalyticsProps>().props;
    const { reportsByType, byStatus, trend, activeUsers } = data;

    /* Build status data for pie */
    const statusData = Object.entries(byStatus).map(([status, value]) => ({
        name: STATUS_LABELS[status as ReportStatus] ?? status,
        value,
        status,
    }));

    /* Total in window */
    const total = statusData.reduce((s, d) => s + d.value, 0);
    const resolved = byStatus['resuelto'] ?? 0;
    const resolvedPct = total > 0 ? Math.round((resolved / total) * 100) : 0;

    /* Trend: last vs previous half */
    const mid = Math.floor(trend.length / 2);
    const firstHalf = trend.slice(0, mid).reduce((s, d) => s + d.total, 0);
    const secondHalf = trend.slice(mid).reduce((s, d) => s + d.total, 0);
    const trendDelta = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

    /* Trend with formatted label */
    const trendData = trend.map((d) => ({ ...d, label: formatDay(d.day) }));

    /* Type pie data */
    const typeData = reportsByType.map((r) => ({ name: r.name ?? 'Sin tipo', value: r.total }));

    /* Users bar data */
    const usersData = activeUsers.map((u) => ({ name: u.name, reportes: u.reports_count }));

    function changeRange(d: number) {
        router.get('/admin/analytics', { days: d }, { preserveState: false });
    }

    return (
        <AdminLayout
            title="Analítica"
            breadcrumbs={[{ label: 'Analítica' }]}
        >
            <Head title="Analítica — Admin" />

            <div className="space-y-5">
                {/* Header + range selector */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-primary">Analítica de reportes</h2>
                        <p className="text-xs text-muted">Datos de los últimos {days} días</p>
                    </div>
                    <div className="flex rounded-lg border border-default bg-surface-primary p-0.5">
                        {DAY_OPTIONS.map((o) => (
                            <button
                                key={o.value}
                                onClick={() => changeRange(o.value)}
                                className={cn(
                                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                    days === o.value
                                        ? 'bg-brand-600 text-white shadow-sm'
                                        : 'text-secondary hover:text-primary',
                                )}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        {
                            label: 'Reportes en rango',
                            value: total,
                            icon: FileText,
                            color: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40',
                        },
                        {
                            label: 'Resueltos',
                            value: resolved,
                            icon: CheckCircle2,
                            color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
                        },
                        {
                            label: 'Tasa de resolución',
                            value: `${resolvedPct}%`,
                            icon: Activity,
                            color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30',
                        },
                        {
                            label: 'Usuarios activos',
                            value: activeUsers.length,
                            icon: Users,
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

                {/* Trend chart */}
                <ChartCard
                    title={
                        `Tendencia diaria — ${trendDelta > 0 ? '↑' : trendDelta < 0 ? '↓' : '='} ${Math.abs(trendDelta)}% vs primera mitad`
                    }
                    delay={0.2}
                >
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: 'var(--color-muted)' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: 'var(--color-muted)' }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend
                                    iconType="circle"
                                    iconSize={7}
                                    wrapperStyle={{ fontSize: 11 }}
                                    formatter={(v) => v === 'total' ? 'Total' : 'Resueltos'}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#gradTotal)"
                                    name="total"
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="resolved"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="url(#gradResolved)"
                                    name="resolved"
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>

                {/* Type + Status side by side */}
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* By type */}
                    <ChartCard title="Distribución por tipo de incidente" delay={0.25}>
                        {typeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={95}
                                        paddingAngle={3}
                                        strokeWidth={0}
                                    >
                                        {typeData.map((_, i) => (
                                            <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend
                                        iconType="circle"
                                        iconSize={7}
                                        wrapperStyle={{ fontSize: 11 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart />
                        )}
                    </ChartCard>

                    {/* By status */}
                    <ChartCard title="Distribución por estado" delay={0.3}>
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={95}
                                        paddingAngle={3}
                                        strokeWidth={0}
                                    >
                                        {statusData.map((d) => (
                                            <Cell key={d.status} fill={STATUS_PALETTE[d.status] ?? '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend
                                        iconType="circle"
                                        iconSize={7}
                                        wrapperStyle={{ fontSize: 11 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart />
                        )}
                    </ChartCard>
                </div>

                {/* Active users bar chart */}
                <ChartCard title="Usuarios más activos (por reportes en rango)" delay={0.35}>
                    {usersData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                                data={usersData}
                                layout="vertical"
                                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10, fill: 'var(--color-muted)' }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: 'var(--color-muted)' }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={90}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar
                                    dataKey="reportes"
                                    fill="#3b82f6"
                                    radius={[0, 4, 4, 0]}
                                    maxBarSize={16}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart message="Sin actividad en este rango" />
                    )}
                </ChartCard>
            </div>
        </AdminLayout>
    );
}

function EmptyChart({ message = 'Sin datos disponibles' }: { message?: string }) {
    return (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <Activity className="h-8 w-8 text-muted/30" />
            <p className="text-xs text-muted">{message}</p>
        </div>
    );
}

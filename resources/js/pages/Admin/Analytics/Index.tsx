import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    BarChart, Bar,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, FileText, CheckCircle2, Activity, HelpCircle, X } from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import ZoneMap, { type ZoneStat } from '@/components/reports/ZoneMap';
import { cn, STATUS_LABELS } from '@/lib/utils';
import type { PageProps, ReportStatus, User } from '@/types';

/* ── Types ────────────────────────────────────────────────────── */
interface AnalyticsData {
    reportsByType: { name: string; total: number }[];
    byStatus: Record<string, number>;
    trend: { day: string; total: number; resolved: number }[];
    activeUsers: (Pick<User, 'id' | 'name' | 'email' | 'is_active'> & { reports_count: number })[];
    zones: ZoneStat[];
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
    notificado:  '#8b5cf6',
    en_camino:   '#0ea5e9',
    en_revision: '#3b82f6',
    en_proceso:  '#f97316',
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

/* ── Chart styling ────────────────────────────────────────────── */
// White axis labels on the dark-blue cards; the grid stays faint so it doesn't compete.
const AXIS_TICK = { fontSize: 11, fill: '#ffffff' };
const GRID_STROKE = 'rgba(255, 255, 255, 0.12)';

// Trend: every day gets its own column so dates never overlap; when the range doesn't fit,
// the chart scrolls sideways instead of squeezing the labels together.
const TREND_PX_PER_DAY = 76;

// Active users: 5 rows visible, the rest reachable by scrolling the card vertically.
const USER_ROW_PX = 44;
const USERS_VISIBLE = 5;

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

/* ── Help content per chart ───────────────────────────────────── */
const HELP_CONTENT = {
    trend: {
        title: '¿Qué significa la tendencia diaria?',
        body: (days: number) => (
            <>
                <p>
                    La gráfica muestra cuántos reportes se crearon cada día dentro del rango
                    seleccionado ({days} días), y cuántos de esos ya fueron marcados como resueltos.
                </p>
                <p>
                    El porcentaje junto al título compara el total de reportes de la <strong>segunda
                    mitad</strong> del rango contra la <strong>primera mitad</strong>: si subió, se
                    muestra en positivo (creciendo); si bajó, en negativo. Cuando no hay suficientes
                    reportes en la primera mitad para comparar, ese porcentaje simplemente no se
                    muestra.
                </p>
            </>
        ),
    },
    type: {
        title: '¿Qué significa "Distribución por tipo de incidente"?',
        body: (days: number) => (
            <p>
                Muestra qué porcentaje de los reportes creados en los últimos {days} días corresponde
                a cada tipo de incidente (bache, inundación, señalización, etc.). Sirve para ver qué
                tipo de problema es más frecuente.
            </p>
        ),
    },
    status: {
        title: '¿Qué significa "Distribución por estado"?',
        body: (days: number) => (
            <p>
                Muestra qué porcentaje de los reportes de los últimos {days} días está en cada estado
                del flujo (pendiente, en revisión, notificado a la entidad, resuelto). Sirve para ver
                qué tan avanzada va la gestión de los reportes.
            </p>
        ),
    },
    users: {
        title: '¿Qué significa "Usuarios más activos"?',
        body: (days: number) => (
            <p>
                Lista a los ciudadanos que más reportes crearon en los últimos {days} días, ordenados
                de mayor a menor. Solo se muestran usuarios con al menos un reporte en ese periodo,
                hasta un máximo de 10.
            </p>
        ),
    },
} as const;

/* ── Subcomponents ────────────────────────────────────────────── */
function ChartCard({ title, children, delay = 0, onHelp }: {
    title: string; children: React.ReactNode; delay?: number; onHelp?: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="rounded-xl border border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]"
        >
            <div className="mb-4 flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-primary">{title}</h3>
                {onHelp && (
                    <button
                        type="button"
                        onClick={onHelp}
                        aria-label="¿Qué significa esto?"
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-tertiary hover:text-primary"
                    >
                        <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            {children}
        </motion.div>
    );
}

function HelpModal({ open, onClose, title, children }: {
    open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 12 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-2xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="help-modal-title"
                    >
                        <button
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="flex flex-col items-center px-6 py-8 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15">
                                <HelpCircle className="h-6 w-6 text-brand-400" />
                            </div>

                            <h2 id="help-modal-title" className="mt-4 text-lg font-bold text-white">
                                {title}
                            </h2>
                            <div className="mt-2 space-y-2 text-sm leading-relaxed text-white/70">
                                {children}
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                            >
                                Entendido
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function AnalyticsIndex() {
    const { data, days } = usePage<AnalyticsProps>().props;
    const { reportsByType, byStatus, trend, activeUsers } = data;
    const [helpOpen, setHelpOpen] = useState<keyof typeof HELP_CONTENT | null>(null);

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
    const trendDelta = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : null;

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
                        trendDelta === null
                            ? 'Tendencia diaria'
                            : `Tendencia diaria — ${trendDelta > 0 ? `+${trendDelta}%` : trendDelta < 0 ? `${trendDelta}%` : 'sin cambios'} vs. primera mitad del periodo`
                    }
                    delay={0.2}
                    onHelp={() => setHelpOpen('trend')}
                >
                    {trendData.length > 0 ? (
                        <>
                        <div className="chart-scroll overflow-x-auto pb-2">
                        <div style={{ width: trendData.length * TREND_PX_PER_DAY, minWidth: '100%' }}>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={trendData} margin={{ top: 5, right: 16, left: -20, bottom: 0 }}>
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
                                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                                <XAxis
                                    dataKey="label"
                                    tick={AXIS_TICK}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                />
                                <YAxis
                                    tick={AXIS_TICK}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<ChartTooltip />} />
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
                        </div>
                        </div>
                        {/* Legend outside the scroll area so it stays visible while scrolling. */}
                        <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-white">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3b82f6]" />Total</span>
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#10b981]" />Resueltos</span>
                        </div>
                        </>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>

                {/* Type + Status side by side */}
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* By type */}
                    <ChartCard title="Distribución por tipo de incidente" delay={0.25} onHelp={() => setHelpOpen('type')}>
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
                    <ChartCard title="Distribución por estado" delay={0.3} onHelp={() => setHelpOpen('status')}>
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
                <ChartCard title="Usuarios más activos (por reportes en rango)" delay={0.35} onHelp={() => setHelpOpen('users')}>
                    {usersData.length > 0 ? (
                        <div
                            className="chart-scroll overflow-y-auto pr-1"
                            style={{ maxHeight: USERS_VISIBLE * USER_ROW_PX + 30 }}
                        >
                        <ResponsiveContainer width="100%" height={usersData.length * USER_ROW_PX + 30}>
                            <BarChart
                                data={usersData}
                                layout="vertical"
                                margin={{ top: 0, right: 24, left: 10, bottom: 0 }}
                                barCategoryGap={10}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
                                <XAxis
                                    type="number"
                                    orientation="top"
                                    tick={AXIS_TICK}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ ...AXIS_TICK, fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={190}
                                    interval={0}
                                />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }} />
                                <Bar
                                    dataKey="reportes"
                                    fill="#3b82f6"
                                    radius={[0, 4, 4, 0]}
                                    maxBarSize={24}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart message="Sin actividad en este rango" />
                    )}
                </ChartCard>

                {/* RF-32: incidents by zone */}
                <ChartCard title="Incidentes por zona" delay={0.4}>
                    {(data.zones ?? []).length > 0 ? (
                        <div className="space-y-4">
                            <ZoneMap zones={data.zones} />
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-default text-left text-muted">
                                            <th className="py-2 pr-3 font-medium">Zona (referencia)</th>
                                            <th className="py-2 pr-3 font-medium">Tipo más frecuente</th>
                                            <th className="py-2 pr-3 text-right font-medium">Total</th>
                                            <th className="py-2 pr-3 text-right font-medium">Abiertos</th>
                                            <th className="py-2 text-right font-medium">Resueltos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-default">
                                        {data.zones.slice(0, 10).map((z) => (
                                            <tr key={`${z.lat}:${z.lng}`}>
                                                <td className="max-w-[260px] truncate py-2 pr-3 text-secondary" title={z.reference}>
                                                    {z.reference}
                                                </td>
                                                <td className="py-2 pr-3 text-secondary">{z.top_type}</td>
                                                <td className="py-2 pr-3 text-right font-semibold text-primary">{z.total}</td>
                                                <td className="py-2 pr-3 text-right text-amber-400">{z.open}</td>
                                                <td className="py-2 text-right text-emerald-400">{z.resolved}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[11px] text-muted">
                                Cada zona es un cuadrante de ~550 m. El tamaño del círculo indica la cantidad de
                                reportes y el color qué tanto sigue abierto (rojo) o resuelto (verde).
                            </p>
                        </div>
                    ) : (
                        <EmptyChart message="Sin reportes en este rango" />
                    )}
                </ChartCard>
            </div>

            <HelpModal
                open={helpOpen !== null}
                onClose={() => setHelpOpen(null)}
                title={helpOpen ? HELP_CONTENT[helpOpen].title : ''}
            >
                {helpOpen && HELP_CONTENT[helpOpen].body(days)}
            </HelpModal>
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

import { useRef, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Mail, Phone, Camera, Pencil, X, Check, Loader2, Lock, ShieldCheck,
    FileText, CheckCircle2, Clock3, Timer, History, Users as UsersIcon,
    BellRing, ToggleLeft, ToggleRight,
} from 'lucide-react';
import OperatorLayout from '@/components/shared/OperatorLayout';
import { FlashMessages } from '@/components/ui/alert';
import { cn, getStorageUrl, formatRelativeTime, STATUS_LABELS } from '@/lib/utils';
import type { PageProps, ReportStatusHistory, User } from '@/types';

interface EntityStats {
    total: number;
    resueltos: number;
    pendientes: number;
    avg_resolution_days: number | null;
}

type Teammate = Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'profile_photo'> & { name: string };

interface OperatorProfilePageProps extends PageProps {
    user: PageProps['auth']['user'];
    stats: EntityStats;
    recent_activity: ReportStatusHistory[];
    teammates: Teammate[];
}

export default function OperatorProfile() {
    const { user, stats, recent_activity, teammates } = usePage<OperatorProfilePageProps>().props;

    const [editing, setEditing] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const photoRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        first_name: user!.first_name,
        last_name: user!.last_name,
        email: user!.email,
        phone: user!.phone ?? '',
        profile_photo: null as File | null,
    });

    function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('profile_photo', file);
        if (file) setPhotoPreview(URL.createObjectURL(file));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.put('/operador/perfil', {
            forceFormData: true,
            onSuccess: () => {
                setEditing(false);
                setPhotoPreview(null);
            },
        });
    }

    function cancelEdit() {
        setEditing(false);
        setPhotoPreview(null);
        form.reset();
        form.clearErrors();
    }

    const avatarUrl = photoPreview ?? (user!.profile_photo ? getStorageUrl(user!.profile_photo) : null);
    const avatarLetter = user!.name?.[0]?.toUpperCase() ?? 'U';

    return (
        <OperatorLayout breadcrumb="Mi perfil">
            <Head title="Mi perfil" />

            <div className="mx-auto max-w-2xl space-y-4">
                <FlashMessages />

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl border border-default bg-surface-primary p-6 shadow-[var(--shadow-card)]"
                >
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                        <div className="shrink-0">
                            <div className="relative inline-block">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={user!.name}
                                        className="h-24 w-24 rounded-full object-cover ring-4 ring-surface-secondary"
                                    />
                                ) : (
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-3xl font-bold text-brand-700 ring-4 ring-surface-secondary dark:bg-brand-900/40 dark:text-brand-400">
                                        {avatarLetter}
                                    </div>
                                )}

                                {editing && (
                                    <button
                                        type="button"
                                        onClick={() => photoRef.current?.click()}
                                        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-md transition-colors hover:bg-brand-700"
                                        title="Cambiar foto"
                                    >
                                        <Camera className="h-4 w-4" />
                                    </button>
                                )}
                                <input
                                    ref={photoRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            {editing ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field label="Nombres" error={form.errors.first_name}>
                                            <input
                                                type="text"
                                                value={form.data.first_name}
                                                onChange={(e) => form.setData('first_name', e.target.value)}
                                                className={inputClass(!!form.errors.first_name)}
                                            />
                                        </Field>

                                        <Field label="Apellidos" error={form.errors.last_name}>
                                            <input
                                                type="text"
                                                value={form.data.last_name}
                                                onChange={(e) => form.setData('last_name', e.target.value)}
                                                className={inputClass(!!form.errors.last_name)}
                                            />
                                        </Field>

                                        <Field label="Correo" error={form.errors.email}>
                                            <input
                                                type="email"
                                                value={form.data.email}
                                                onChange={(e) => form.setData('email', e.target.value)}
                                                className={inputClass(!!form.errors.email)}
                                            />
                                        </Field>

                                        <Field label="Teléfono" error={form.errors.phone}>
                                            <input
                                                type="text"
                                                value={form.data.phone}
                                                onChange={(e) => form.setData('phone', e.target.value)}
                                                className={inputClass(!!form.errors.phone)}
                                            />
                                        </Field>
                                    </div>

                                    {form.data.profile_photo && (
                                        <p className="text-xs text-brand-600">
                                            Nueva foto: {form.data.profile_photo.name}
                                        </p>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={form.processing}
                                            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                                        >
                                            {form.processing ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Check className="h-3.5 w-3.5" />
                                            )}
                                            Guardar cambios
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            className="flex items-center gap-1.5 rounded-lg border border-default px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-tertiary"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h1 className="text-xl font-bold text-primary">{user!.name}</h1>
                                            <span className="mt-0.5 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                                Operador
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="flex items-center gap-1.5 rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-surface-tertiary hover:text-primary"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Editar
                                        </button>
                                    </div>

                                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                        <div className="flex items-center gap-2 text-sm text-secondary">
                                            <Mail className="h-4 w-4 shrink-0 text-muted" />
                                            {user!.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-secondary">
                                            <Phone className="h-4 w-4 shrink-0 text-muted" />
                                            {user!.phone || <span className="text-muted italic">Sin teléfono</span>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                <StatsGrid stats={stats} />

                <div className="grid gap-4 sm:grid-cols-2">
                    <RecentActivityCard activity={recent_activity} />
                    <TeammatesCard teammates={teammates} />
                </div>

                <SecurityCard />

                <PreferencesCard notifyByEmail={user!.notify_by_email} />
            </div>
        </OperatorLayout>
    );
}

function StatsGrid({ stats }: { stats: EntityStats }) {
    const cards = [
        { key: 'total', label: 'Reportes totales', value: stats.total, icon: FileText, color: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40' },
        { key: 'resueltos', label: 'Resueltos', value: stats.resueltos, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
        { key: 'pendientes', label: 'Pendientes', value: stats.pendientes, icon: Clock3, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
        {
            key: 'avg',
            label: 'Tiempo prom. de resolución',
            value: stats.avg_resolution_days !== null ? `${stats.avg_resolution_days} d` : '—',
            icon: Timer,
            color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map(({ key, label, value, icon: Icon, color }, i) => (
                <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-default bg-surface-primary p-4 text-center shadow-[var(--shadow-card)]"
                >
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', color)}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xl font-bold text-primary">{value}</span>
                    <span className="text-[11px] leading-tight text-muted">{label}</span>
                </motion.div>
            ))}
        </div>
    );
}

function RecentActivityCard({ activity }: { activity: ReportStatusHistory[] }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-2xl border border-default bg-surface-primary p-6 shadow-[var(--shadow-card)]"
        >
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                    <History className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-primary">Actividad reciente</h2>
            </div>

            {activity.length === 0 ? (
                <p className="text-xs text-muted">Aún no has actualizado ningún reporte.</p>
            ) : (
                <ul className="space-y-3">
                    {activity.map((h) => (
                        <li key={h.id}>
                            <Link
                                href={`/operador/reportes/${h.report_id}`}
                                className="block text-xs text-secondary transition-colors hover:text-primary"
                            >
                                Marcaste el reporte{' '}
                                <span className="font-medium text-primary">#{h.report_id}</span>
                                {' '}como{' '}
                                <span className="font-medium text-primary">{STATUS_LABELS[h.new_status]}</span>
                                <span className="ml-1 text-muted">· {formatRelativeTime(h.created_at)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </motion.div>
    );
}

function TeammatesCard({ teammates }: { teammates: Teammate[] }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
            className="rounded-2xl border border-default bg-surface-primary p-6 shadow-[var(--shadow-card)]"
        >
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                    <UsersIcon className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-primary">Compañeros de la entidad</h2>
            </div>

            {teammates.length === 0 ? (
                <p className="text-xs text-muted">Eres el único usuario activo de esta entidad.</p>
            ) : (
                <ul className="space-y-3">
                    {teammates.map((t) => {
                        const avatarUrl = t.profile_photo ? getStorageUrl(t.profile_photo) : null;
                        return (
                            <li key={t.id} className="flex items-center gap-3">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={t.name} className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                        {t.name?.[0]?.toUpperCase() ?? 'U'}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-primary">{t.name}</p>
                                    <p className="truncate text-[11px] text-muted">{t.email}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </motion.div>
    );
}

function PreferencesCard({ notifyByEmail }: { notifyByEmail: boolean }) {
    const [toggling, setToggling] = useState(false);

    function toggle() {
        if (toggling) return;
        setToggling(true);
        router.put('/operador/perfil/preferencias', { notify_by_email: !notifyByEmail }, {
            preserveScroll: true,
            onFinish: () => setToggling(false),
        });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16 }}
            className="rounded-2xl border border-default bg-surface-primary p-6 shadow-[var(--shadow-card)]"
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                        <BellRing className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-primary">Notificaciones por correo</h2>
                        <p className="text-xs text-muted">
                            Recibir un correo cuando te asignen un reporte nuevo. Las notificaciones dentro de la app siempre se reciben.
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggle}
                    disabled={toggling}
                    title={notifyByEmail ? 'Desactivar' : 'Activar'}
                    className="shrink-0 text-muted transition-colors hover:text-primary disabled:opacity-50"
                >
                    {toggling ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : notifyByEmail ? (
                        <ToggleRight className="h-6 w-6 text-emerald-500" />
                    ) : (
                        <ToggleLeft className="h-6 w-6" />
                    )}
                </button>
            </div>
        </motion.div>
    );
}

function SecurityCard() {
    const [changing, setChanging] = useState(false);

    const form = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.put('/operador/perfil/password', {
            preserveScroll: true,
            onSuccess: () => {
                setChanging(false);
                form.reset();
            },
        });
    }

    function cancel() {
        setChanging(false);
        form.reset();
        form.clearErrors();
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="rounded-2xl border border-default bg-surface-primary p-6 shadow-[var(--shadow-card)]"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                        <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-primary">Seguridad</h2>
                        <p className="text-xs text-muted">
                            {changing ? 'Ingresa tu contraseña actual para confirmar el cambio.' : 'Cambia la contraseña de tu cuenta.'}
                        </p>
                    </div>
                </div>
                {!changing && (
                    <button
                        onClick={() => setChanging(true)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-default px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-surface-tertiary hover:text-primary"
                    >
                        <Lock className="h-3.5 w-3.5" />
                        Cambiar contraseña
                    </button>
                )}
            </div>

            {changing && (
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <Field label="Contraseña actual" error={form.errors.current_password}>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={form.data.current_password}
                            onChange={(e) => form.setData('current_password', e.target.value)}
                            className={inputClass(!!form.errors.current_password)}
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nueva contraseña" error={form.errors.password}>
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                className={inputClass(!!form.errors.password)}
                            />
                        </Field>

                        <Field label="Confirmar contraseña" error={form.errors.password_confirmation}>
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password_confirmation}
                                onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                className={inputClass(!!form.errors.password_confirmation)}
                            />
                        </Field>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                        >
                            {form.processing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5" />
                            )}
                            Actualizar contraseña
                        </button>
                        <button
                            type="button"
                            onClick={cancel}
                            className="flex items-center gap-1.5 rounded-lg border border-default px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-tertiary"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </motion.div>
    );
}

function inputClass(hasError: boolean) {
    return cn(
        'rounded-lg border px-3 py-2 text-sm text-primary outline-none transition-colors',
        'bg-surface-primary focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
        hasError ? 'border-red-400' : 'border-default',
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">{label}</label>
            {children}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

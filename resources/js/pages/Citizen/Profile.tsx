import { useRef, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    User, Mail, Phone, Camera, Pencil, X, Check,
    AlertTriangle, MessageSquare, Heart, Loader2,
} from 'lucide-react';
import AppLayout from '@/components/shared/AppLayout';
import ReportCard from '@/components/reports/ReportCard';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { FlashMessages } from '@/components/ui/alert';
import { cn, getStorageUrl } from '@/lib/utils';
import type { PageProps, Report } from '@/types';

interface Stats {
    reports: number;
    comments: number;
    likes_given: number;
}

interface ProfilePageProps extends PageProps {
    stats: Stats;
    my_reports: Report[];
}

const statCards = [
    { key: 'reports' as const, label: 'Reportes', icon: AlertTriangle, color: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40' },
    { key: 'comments' as const, label: 'Comentarios', icon: MessageSquare, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
    { key: 'likes_given' as const, label: 'Likes dados', icon: Heart, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
];

export default function Profile() {
    const { auth, stats, my_reports } = usePage<ProfilePageProps>().props;
    const user = auth.user!;

    const [editing, setEditing] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const photoRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        name: user.name,
        phone: user.phone,
        profile_photo: null as File | null,
    });

    function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('profile_photo', file);
        if (file) setPhotoPreview(URL.createObjectURL(file));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.put('/profile', {
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

    const avatarUrl = photoPreview ?? (user.profile_photo ? getStorageUrl(user.profile_photo) : null);
    const avatarLetter = user.name?.[0]?.toUpperCase() ?? 'U';

    return (
        <AppLayout>
            <Head title="Mi perfil" />

            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <FlashMessages />

                {/* Profile card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6 rounded-2xl border border-default bg-surface-primary p-6 shadow-[var(--shadow-card)]"
                >
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                        {/* Avatar */}
                        <div className="shrink-0">
                            <div className="relative inline-block">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={user.name}
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

                        {/* Info / form */}
                        <div className="flex-1 min-w-0">
                            {editing ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {/* Name */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium text-muted">Nombre completo</label>
                                            <input
                                                type="text"
                                                value={form.data.name}
                                                onChange={(e) => form.setData('name', e.target.value)}
                                                className={cn(
                                                    'rounded-lg border px-3 py-2 text-sm text-primary outline-none transition-colors',
                                                    'bg-surface-primary focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                                                    form.errors.name ? 'border-red-400' : 'border-default',
                                                )}
                                            />
                                            {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
                                        </div>

                                        {/* Phone */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium text-muted">Teléfono</label>
                                            <input
                                                type="text"
                                                value={form.data.phone}
                                                onChange={(e) => form.setData('phone', e.target.value)}
                                                className={cn(
                                                    'rounded-lg border px-3 py-2 text-sm text-primary outline-none transition-colors',
                                                    'bg-surface-primary focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                                                    form.errors.phone ? 'border-red-400' : 'border-default',
                                                )}
                                            />
                                            {form.errors.phone && <p className="text-xs text-red-500">{form.errors.phone}</p>}
                                        </div>
                                    </div>

                                    {/* Photo name indicator */}
                                    {form.data.profile_photo && (
                                        <p className="text-xs text-brand-600">
                                            Nueva foto: {form.data.profile_photo.name}
                                        </p>
                                    )}

                                    {/* Actions */}
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
                                            <h1 className="text-xl font-bold text-primary">{user.name}</h1>
                                            <span className="mt-0.5 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                                {user.role === 'admin' ? 'Administrador' : 'Ciudadano'}
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

                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-secondary">
                                            <Mail className="h-4 w-4 text-muted" />
                                            {user.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-secondary">
                                            <Phone className="h-4 w-4 text-muted" />
                                            {user.phone || <span className="text-muted italic">Sin teléfono</span>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="mt-6 grid grid-cols-3 gap-3 border-t border-default pt-6">
                        {statCards.map(({ key, label, icon: Icon, color }) => (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex flex-col items-center gap-2 rounded-xl border border-default p-4 text-center"
                            >
                                <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', color)}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <span className="text-2xl font-bold text-primary">{stats[key]}</span>
                                <span className="text-xs text-muted">{label}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* My reports */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-primary">Mis reportes</h2>
                        {my_reports.length === 6 && (
                            <a
                                href="/reportes"
                                className="text-xs text-brand-600 underline hover:text-brand-700"
                            >
                                Ver todos en el feed
                            </a>
                        )}
                    </div>

                    {my_reports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-default border-dashed py-16 text-center">
                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-tertiary">
                                <AlertTriangle className="h-7 w-7 text-muted opacity-50" />
                            </div>
                            <p className="text-sm font-medium text-primary">Sin reportes aún</p>
                            <p className="mt-1 text-xs text-muted">
                                Ve al mapa y registra tu primer incidente.
                            </p>
                            <a
                                href="/inicio"
                                className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                            >
                                Ir al mapa
                            </a>
                        </div>
                    ) : (
                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {my_reports.map((report) => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    onReportClick={(r) => setSelectedReportId(r.id)}
                                />
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>

            <ReportDrawer
                reportId={selectedReportId}
                onClose={() => setSelectedReportId(null)}
            />
        </AppLayout>
    );
}

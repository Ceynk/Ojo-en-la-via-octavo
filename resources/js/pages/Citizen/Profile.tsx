import { useRef, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    User, Mail, Phone, Camera, Pencil, X, Check,
    AlertTriangle, MessageSquare, Heart, Loader2,
    IdCard, Home, MapPin, Cake, Users as UsersIcon,
} from 'lucide-react';
import AppLayout from '@/components/shared/AppLayout';
import ReportCard from '@/components/reports/ReportCard';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { FlashMessages } from '@/components/ui/alert';
import { cn, DOCUMENT_TYPE_LABELS, GENDER_LABELS, getStorageUrl } from '@/lib/utils';
import type { PageProps, Report, DocumentType, Gender } from '@/types';

const DOCUMENT_TYPES: DocumentType[] = ['CC', 'TI', 'CE', 'PA'];
const GENDERS: Gender[] = ['masculino', 'femenino', 'otro', 'prefiero_no_decir'];

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
    { key: 'reports' as const, label: 'Reportes creados', icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/15 border border-amber-500/30' },
    { key: 'comments' as const, label: 'Comentarios', icon: MessageSquare, color: 'text-brand-400 bg-brand-500/15 border border-brand-500/30' },
    { key: 'likes_given' as const, label: 'Likes otorgados', icon: Heart, color: 'text-rose-400 bg-rose-500/15 border border-rose-500/30' },
];

export default function Profile() {
    const { auth, stats, my_reports } = usePage<ProfilePageProps>().props;
    const user = auth.user!;

    const [editing, setEditing] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const photoRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        document_type: user.document_type ?? '',
        document_number: user.document_number ?? '',
        address: user.address ?? '',
        neighborhood: user.neighborhood ?? '',
        birth_date: user.birth_date ?? '',
        gender: user.gender ?? '',
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
                    className="mb-8 rounded-3xl border border-white/15 bg-slate-900/90 p-7 shadow-2xl backdrop-blur-2xl"
                >
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                        {/* Avatar */}
                        <div className="shrink-0">
                            <div className="relative inline-block">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={user.name}
                                        className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-500/30 shadow-lg"
                                    />
                                ) : (
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-3xl font-bold text-white ring-4 ring-brand-500/30 shadow-lg">
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
                                        <ProfileField label="Nombres" error={form.errors.first_name}>
                                            <input
                                                type="text"
                                                value={form.data.first_name}
                                                onChange={(e) => form.setData('first_name', e.target.value)}
                                                className={inputClass(!!form.errors.first_name)}
                                            />
                                        </ProfileField>

                                        <ProfileField label="Apellidos" error={form.errors.last_name}>
                                            <input
                                                type="text"
                                                value={form.data.last_name}
                                                onChange={(e) => form.setData('last_name', e.target.value)}
                                                className={inputClass(!!form.errors.last_name)}
                                            />
                                        </ProfileField>

                                        <ProfileField label="Teléfono" error={form.errors.phone}>
                                            <input
                                                type="text"
                                                value={form.data.phone}
                                                onChange={(e) => form.setData('phone', e.target.value)}
                                                className={inputClass(!!form.errors.phone)}
                                            />
                                        </ProfileField>

                                        <ProfileField label="Tipo de documento" error={form.errors.document_type}>
                                            <select
                                                value={form.data.document_type}
                                                onChange={(e) => form.setData('document_type', e.target.value)}
                                                className={inputClass(!!form.errors.document_type)}
                                            >
                                                <option value="" disabled className="bg-slate-900 text-slate-400">Selecciona un tipo</option>
                                                {DOCUMENT_TYPES.map((d) => (
                                                    <option key={d} value={d} className="bg-slate-900 text-white">{DOCUMENT_TYPE_LABELS[d]}</option>
                                                ))}
                                            </select>
                                        </ProfileField>

                                        <ProfileField label="Número de documento" error={form.errors.document_number}>
                                            <input
                                                type="text"
                                                value={form.data.document_number}
                                                onChange={(e) => form.setData('document_number', e.target.value)}
                                                className={inputClass(!!form.errors.document_number)}
                                            />
                                        </ProfileField>

                                        <ProfileField label="Fecha de nacimiento" error={form.errors.birth_date}>
                                            <input
                                                type="date"
                                                value={form.data.birth_date}
                                                onChange={(e) => form.setData('birth_date', e.target.value)}
                                                className={inputClass(!!form.errors.birth_date)}
                                            />
                                        </ProfileField>

                                        <ProfileField label="Dirección" error={form.errors.address}>
                                            <input
                                                type="text"
                                                value={form.data.address}
                                                onChange={(e) => form.setData('address', e.target.value)}
                                                className={inputClass(!!form.errors.address)}
                                            />
                                        </ProfileField>

                                        <ProfileField label="Barrio" error={form.errors.neighborhood}>
                                            <input
                                                type="text"
                                                value={form.data.neighborhood}
                                                onChange={(e) => form.setData('neighborhood', e.target.value)}
                                                className={inputClass(!!form.errors.neighborhood)}
                                            />
                                        </ProfileField>

                                        <ProfileField label="Género" error={form.errors.gender}>
                                            <select
                                                value={form.data.gender}
                                                onChange={(e) => form.setData('gender', e.target.value)}
                                                className={inputClass(!!form.errors.gender)}
                                            >
                                                <option value="" disabled className="bg-slate-900 text-slate-400">Selecciona una opción</option>
                                                {GENDERS.map((g) => (
                                                    <option key={g} value={g} className="bg-slate-900 text-white">{GENDER_LABELS[g]}</option>
                                                ))}
                                            </select>
                                        </ProfileField>
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
                                            <h1 className="text-xl font-bold tracking-tight text-white">{user.name}</h1>
                                            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-brand-300">
                                                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                                                {user.role === 'admin' ? 'Administrador' : 'Ciudadano activo'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-brand-500/40 hover:bg-brand-500/15 hover:text-white shadow-xs"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Editar perfil
                                        </button>
                                    </div>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                                            {user.email}
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                                            {user.phone || <span className="text-slate-500 italic">Sin teléfono</span>}
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                            <IdCard className="h-4 w-4 shrink-0 text-slate-400" />
                                            {user.document_type && user.document_number
                                                ? `${user.document_type} ${user.document_number}`
                                                : <span className="text-slate-500 italic">Sin documento</span>}
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                            <Cake className="h-4 w-4 shrink-0 text-slate-400" />
                                            {user.birth_date || <span className="text-slate-500 italic">Sin fecha de nacimiento</span>}
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                            <Home className="h-4 w-4 shrink-0 text-slate-400" />
                                            {user.address || <span className="text-slate-500 italic">Sin dirección</span>}
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                                            {user.neighborhood || <span className="text-slate-500 italic">Sin barrio</span>}
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                            <UsersIcon className="h-4 w-4 shrink-0 text-slate-400" />
                                            {user.gender ? GENDER_LABELS[user.gender] : <span className="text-slate-500 italic">Sin género</span>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
                        {statCards.map(({ key, label, icon: Icon, color }) => (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center transition-all hover:border-white/20 hover:bg-slate-950/60 shadow-xs"
                            >
                                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shadow-xs', color)}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className="text-2xl font-bold tracking-tight text-white">{stats[key]}</span>
                                <span className="text-xs font-medium text-slate-400">{label}</span>
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

function inputClass(hasError: boolean) {
    return cn(
        'rounded-xl border px-3.5 py-2.5 text-sm text-white outline-none transition-all',
        'bg-slate-950/70 backdrop-blur-md focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30',
        hasError ? 'border-red-500/70 bg-red-950/20 text-red-200' : 'border-white/15 hover:border-white/30',
    );
}

function ProfileField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">{label}</label>
            {children}
            {error && <p className="text-xs font-medium text-red-400">{error}</p>}
        </div>
    );
}

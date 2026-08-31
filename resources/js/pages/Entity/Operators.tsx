import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserCog, ToggleLeft, ToggleRight, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import EntityLayout from '@/components/shared/EntityLayout';
import { FlashMessages } from '@/components/ui/alert';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { PageProps, User } from '@/types';

interface EntityOperatorsProps extends PageProps {
    operators: Pick<User, 'id' | 'entity_id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'is_active' | 'location_updated_at'>[];
}

export default function EntityOperators() {
    const { operators } = usePage<EntityOperatorsProps>().props;
    const [showCreate, setShowCreate] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const form = useForm({ first_name: '', last_name: '', email: '', phone: '' });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/entidad/operadores', {
            onSuccess: () => {
                form.reset();
                setShowCreate(false);
            },
        });
    }

    function toggle(userId: number) {
        if (togglingId) return;
        setTogglingId(userId);
        router.patch(`/entidad/operadores/${userId}/toggle`, {}, {
            onFinish: () => setTogglingId(null),
        });
    }

    return (
        <EntityLayout breadcrumb="Operadores">
            <Head title="Operadores" />

            <div className="space-y-4">
                <FlashMessages />

                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">
                        {operators.length} operador{operators.length !== 1 ? 'es' : ''}
                    </p>
                    <button
                        onClick={() => setShowCreate((v) => !v)}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            showCreate
                                ? 'border border-default text-secondary hover:bg-surface-tertiary'
                                : 'bg-brand-600 text-white hover:bg-brand-700',
                        )}
                    >
                        <Plus className={cn('h-4 w-4 transition-transform', showCreate && 'rotate-45')} />
                        {showCreate ? 'Cancelar' : 'Nuevo operador'}
                    </button>
                </div>

                <AnimatePresence>
                    {showCreate && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <form onSubmit={submit} className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 dark:border-brand-800 dark:bg-brand-950/20">
                                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                                    <UserCog className="h-4 w-4 text-brand-600" />
                                    Nuevo operador
                                </h3>
                                <div className="grid gap-3 sm:grid-cols-2">
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
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                                >
                                    {form.processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Crear operador
                                </button>
                                <p className="mt-2 text-xs text-muted">
                                    Se le enviará un correo de invitación para que defina su propia contraseña.
                                </p>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {operators.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-default py-16 text-center">
                        <UserCog className="h-10 w-10 text-muted/30" />
                        <p className="text-sm font-medium text-secondary">Sin operadores todavía</p>
                        <p className="text-xs text-muted">Crea uno para empezar a atender reportes en el sitio</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {operators.map((op) => (
                            <div key={op.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-default bg-surface-primary p-4 shadow-[var(--shadow-card)]">
                                <span className="flex-1 truncate text-sm font-medium text-primary">
                                    {op.first_name} {op.last_name}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-muted">
                                    <Mail className="h-3 w-3" /> {op.email}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-muted">
                                    <Phone className="h-3 w-3" /> {op.phone || '—'}
                                </span>
                                {op.location_updated_at && (
                                    <span className="flex items-center gap-1.5 text-xs text-muted">
                                        <MapPin className="h-3 w-3" /> visto {formatRelativeTime(op.location_updated_at)}
                                    </span>
                                )}
                                {!op.is_active && (
                                    <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-semibold text-muted">
                                        inactivo
                                    </span>
                                )}
                                <button
                                    onClick={() => toggle(op.id)}
                                    disabled={togglingId === op.id}
                                    title={op.is_active ? 'Desactivar' : 'Activar'}
                                    className="text-muted transition-colors hover:text-primary disabled:opacity-50"
                                >
                                    {togglingId === op.id ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : op.is_active ? (
                                        <ToggleRight className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <ToggleLeft className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </EntityLayout>
    );
}

function inputClass(hasError: boolean) {
    return cn(
        'w-full rounded-lg border px-3 py-2 text-sm text-primary outline-none transition-colors',
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

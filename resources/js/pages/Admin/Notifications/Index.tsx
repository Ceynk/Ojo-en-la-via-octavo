import { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Bell, Search, Users, CheckSquare, Square, Send, Loader2, X } from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import { FlashMessages } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { PageProps, User } from '@/types';

interface NotificationsProps extends PageProps {
    users: Pick<User, 'id' | 'name' | 'email'>[];
}

export default function AdminNotificationsIndex() {
    const { users } = usePage<NotificationsProps>().props;
    const [query, setQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const { data, setData, post, processing, errors, reset } = useForm({
        user_ids: [] as number[],
        title:    '',
        message:  '',
    });

    const filtered = users.filter(
        (u) =>
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase()),
    );

    function toggleUser(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleAll() {
        if (selectedIds.size === filtered.length && filtered.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map((u) => u.id)));
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/admin/notifications/send', {
            data: { ...data, user_ids: Array.from(selectedIds) },
            onSuccess: () => {
                reset('title', 'message');
                setSelectedIds(new Set());
            },
        });
    }

    const allFilteredSelected =
        filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));

    return (
        <AdminLayout
            title="Notificaciones"
            breadcrumbs={[{ label: 'Notificaciones' }]}
        >
            <Head title="Notificaciones — Admin" />

            <div className="space-y-5">
                <FlashMessages />

                <div className="grid gap-5 lg:grid-cols-2">
                    {/* ── Left: user selector ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-default px-5 py-4">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <Users className="h-4 w-4 text-muted" />
                                Destinatarios
                            </h3>
                            {selectedIds.size > 0 && (
                                <span className="flex items-center gap-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                    {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                                    <button onClick={() => setSelectedIds(new Set())}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}
                        </div>

                        {/* Search */}
                        <div className="border-b border-default px-3 py-2">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Buscar usuario…"
                                    className="w-full rounded-lg bg-surface-secondary py-1.5 pl-8 pr-3 text-sm text-primary placeholder:text-muted outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Select all row */}
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="flex items-center gap-3 border-b border-default px-5 py-2.5 text-xs font-medium text-secondary hover:bg-surface-secondary transition-colors"
                        >
                            {allFilteredSelected ? (
                                <CheckSquare className="h-4 w-4 text-brand-600" />
                            ) : (
                                <Square className="h-4 w-4 text-muted" />
                            )}
                            Seleccionar todos ({filtered.length})
                        </button>

                        {/* User list */}
                        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 340 }}>
                            {filtered.length === 0 ? (
                                <p className="py-8 text-center text-xs text-muted">Sin resultados</p>
                            ) : (
                                filtered.map((user) => {
                                    const selected = selectedIds.has(user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => toggleUser(user.id)}
                                            className={cn(
                                                'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors',
                                                selected
                                                    ? 'bg-brand-50/60 dark:bg-brand-950/30'
                                                    : 'hover:bg-surface-secondary',
                                            )}
                                        >
                                            {selected ? (
                                                <CheckSquare className="h-4 w-4 shrink-0 text-brand-600" />
                                            ) : (
                                                <Square className="h-4 w-4 shrink-0 text-muted" />
                                            )}
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-xs font-bold text-secondary">
                                                {user.name[0]?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-primary">{user.name}</p>
                                                <p className="truncate text-xs text-muted">{user.email}</p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>

                    {/* ── Right: message form ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06 }}
                        className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                    >
                        <div className="border-b border-default px-5 py-4">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <Bell className="h-4 w-4 text-muted" />
                                Mensaje de notificación
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 p-5">
                            {/* Title */}
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-secondary">
                                    Título <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    maxLength={200}
                                    placeholder="Ej: Actualización de la plataforma"
                                    className="w-full rounded-lg border border-default bg-surface-secondary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                                />
                                {errors.title && (
                                    <p className="mt-1 text-xs text-red-600">{errors.title}</p>
                                )}
                            </div>

                            {/* Message */}
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-secondary">
                                    Mensaje <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    rows={6}
                                    maxLength={1000}
                                    placeholder="Escribe el contenido de la notificación que recibirán los usuarios seleccionados…"
                                    className="w-full resize-none rounded-lg border border-default bg-surface-secondary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                                />
                                <div className="mt-1 flex items-center justify-between">
                                    {errors.message ? (
                                        <p className="text-xs text-red-600">{errors.message}</p>
                                    ) : (
                                        <span />
                                    )}
                                    <span className={cn(
                                        'text-[11px]',
                                        data.message.length > 900 ? 'text-amber-600' : 'text-muted',
                                    )}>
                                        {data.message.length}/1000
                                    </span>
                                </div>
                            </div>

                            {/* Preview */}
                            {(data.title || data.message) && (
                                <div className="rounded-lg border border-default bg-surface-tertiary p-3">
                                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                                        Vista previa
                                    </p>
                                    {data.title && (
                                        <p className="text-sm font-semibold text-primary">{data.title}</p>
                                    )}
                                    {data.message && (
                                        <p className="mt-0.5 text-xs text-secondary">{data.message}</p>
                                    )}
                                </div>
                            )}

                            {/* Validation: no users selected */}
                            {errors.user_ids && (
                                <p className="text-xs text-red-600">{errors.user_ids}</p>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing || selectedIds.size === 0 || !data.title.trim() || !data.message.trim()}
                                className={cn(
                                    'flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
                                    'bg-brand-600 text-white hover:bg-brand-700',
                                    'disabled:cursor-not-allowed disabled:opacity-50',
                                )}
                            >
                                {processing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                {processing
                                    ? 'Enviando…'
                                    : selectedIds.size === 0
                                    ? 'Selecciona al menos un usuario'
                                    : `Enviar a ${selectedIds.size} usuario${selectedIds.size !== 1 ? 's' : ''}`}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </AdminLayout>
    );
}

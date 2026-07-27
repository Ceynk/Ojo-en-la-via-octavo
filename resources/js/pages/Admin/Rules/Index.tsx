import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    ChevronDown, Loader2, Bell, ShieldAlert,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import { FlashMessages } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { PageProps, NotificationRule, IncidentType } from '@/types';

interface RulesProps extends PageProps {
    rules: NotificationRule[];
    incident_types: IncidentType[];
}

const PRIORITY_STYLES: Record<string, string> = {
    alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    baja:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

/* ── Rule form (create or edit) ─────────────────────────────── */
function RuleForm({
    rule,
    incidentTypes,
    onCancel,
}: {
    rule?: NotificationRule;
    incidentTypes: IncidentType[];
    onCancel: () => void;
}) {
    const isEdit = !!rule;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        incident_type_id: rule?.incident_type_id?.toString() ?? '',
        entity_email:     rule?.entity_email ?? '',
        subject_template: rule?.subject_template ?? '',
        message_template: rule?.message_template ?? '',
        priority:         rule?.priority ?? 'media' as 'alta' | 'media' | 'baja',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit) {
            put(`/admin/rules/${rule.id}`, {
                onSuccess: () => { reset(); onCancel(); },
            });
        } else {
            post('/admin/rules', {
                onSuccess: () => { reset(); onCancel(); },
            });
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                {/* Incident type — only for create */}
                {!isEdit && (
                    <div>
                        <label className="mb-1 block text-xs font-medium text-secondary">
                            Tipo de incidente <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={data.incident_type_id}
                            onChange={(e) => setData('incident_type_id', e.target.value)}
                            className="w-full rounded-lg border border-default bg-surface-secondary py-2 pl-3 pr-8 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                        >
                            <option value="">Seleccionar tipo…</option>
                            {incidentTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {errors.incident_type_id && (
                            <p className="mt-1 text-xs text-red-600">{errors.incident_type_id}</p>
                        )}
                    </div>
                )}

                {/* Entity email */}
                <div className={isEdit ? 'sm:col-span-2' : ''}>
                    <label className="mb-1 block text-xs font-medium text-secondary">
                        Email de entidad <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        value={data.entity_email}
                        onChange={(e) => setData('entity_email', e.target.value)}
                        placeholder="alcaldia@ejemplo.gov.co"
                        className="w-full rounded-lg border border-default bg-surface-secondary py-2 px-3 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    />
                    {errors.entity_email && (
                        <p className="mt-1 text-xs text-red-600">{errors.entity_email}</p>
                    )}
                </div>
            </div>

            {/* Subject template */}
            <div>
                <label className="mb-1 block text-xs font-medium text-secondary">
                    Asunto del email <span className="text-muted">(variables: {'{tipo}'}, {'{id}'})</span>
                </label>
                <input
                    type="text"
                    value={data.subject_template}
                    onChange={(e) => setData('subject_template', e.target.value)}
                    maxLength={300}
                    placeholder="Nuevo reporte de {tipo} en Villavicencio"
                    className="w-full rounded-lg border border-default bg-surface-secondary py-2 px-3 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                />
                {errors.subject_template && (
                    <p className="mt-1 text-xs text-red-600">{errors.subject_template}</p>
                )}
            </div>

            {/* Message template */}
            <div>
                <label className="mb-1 block text-xs font-medium text-secondary">
                    Mensaje <span className="text-muted">(variables: {'{tipo}'}, {'{descripcion}'}, {'{direccion}'}, {'{enlace}'})</span>
                </label>
                <textarea
                    value={data.message_template}
                    onChange={(e) => setData('message_template', e.target.value)}
                    rows={4}
                    placeholder="Se ha registrado un nuevo incidente de tipo {tipo}..."
                    className="w-full resize-none rounded-lg border border-default bg-surface-secondary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                />
                {errors.message_template && (
                    <p className="mt-1 text-xs text-red-600">{errors.message_template}</p>
                )}
            </div>

            {/* Priority */}
            <div>
                <label className="mb-2 block text-xs font-medium text-secondary">Prioridad</label>
                <div className="flex gap-2">
                    {(['alta', 'media', 'baja'] as const).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setData('priority', p)}
                            className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-all',
                                data.priority === p
                                    ? PRIORITY_STYLES[p]
                                    : 'bg-surface-tertiary text-muted hover:bg-surface-secondary',
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                {errors.priority && (
                    <p className="mt-1 text-xs text-red-600">{errors.priority}</p>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-default px-4 py-2 text-sm text-secondary transition-colors hover:bg-surface-tertiary"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={processing}
                    className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                    {processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEdit ? 'Guardar cambios' : 'Crear regla'}
                </button>
            </div>
        </form>
    );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function RulesIndex() {
    const { rules, incident_types } = usePage<RulesProps>().props;
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    function toggleRule(rule: NotificationRule) {
        if (togglingId) return;
        setTogglingId(rule.id);
        router.patch(`/admin/rules/${rule.id}/toggle`, {}, {
            onFinish: () => setTogglingId(null),
        });
    }

    function deleteRule(id: number) {
        if (deletingId) return;
        setDeletingId(id);
        router.delete(`/admin/rules/${id}`, {
            onFinish: () => { setDeletingId(null); setConfirmDeleteId(null); },
        });
    }

    return (
        <AdminLayout
            title="Reglas de notificación"
            breadcrumbs={[{ label: 'Reglas' }]}
        >
            <Head title="Reglas — Admin" />

            <div className="space-y-4">
                <FlashMessages />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">
                        {rules.length} regla{rules.length !== 1 ? 's' : ''} configurada{rules.length !== 1 ? 's' : ''}
                    </p>
                    <button
                        onClick={() => { setShowCreate((v) => !v); setEditingId(null); }}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            showCreate
                                ? 'border border-default text-secondary hover:bg-surface-tertiary'
                                : 'bg-brand-600 text-white hover:bg-brand-700',
                        )}
                    >
                        <Plus className={cn('h-4 w-4 transition-transform', showCreate && 'rotate-45')} />
                        {showCreate ? 'Cancelar' : 'Nueva regla'}
                    </button>
                </div>

                {/* Create form */}
                <AnimatePresence>
                    {showCreate && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 dark:border-brand-800 dark:bg-brand-950/20">
                                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                                    <Bell className="h-4 w-4 text-brand-600" />
                                    Nueva regla de notificación
                                </h3>
                                <RuleForm
                                    incidentTypes={incident_types}
                                    onCancel={() => setShowCreate(false)}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Rules list */}
                {rules.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-default py-16 text-center"
                    >
                        <ShieldAlert className="h-10 w-10 text-muted/30" />
                        <p className="text-sm font-medium text-secondary">Sin reglas configuradas</p>
                        <p className="text-xs text-muted">Crea una regla para enviar emails automáticos a entidades</p>
                    </motion.div>
                ) : (
                    <div className="space-y-2">
                        {rules.map((rule, i) => (
                            <motion.div
                                key={rule.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                            >
                                {/* Rule header */}
                                <div className="flex flex-wrap items-center gap-3 p-4">
                                    {/* Type badge */}
                                    <span className="rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs font-semibold text-secondary">
                                        {rule.incident_type?.name ?? '—'}
                                    </span>

                                    {/* Email */}
                                    <span className="flex-1 truncate text-sm text-primary">
                                        {rule.entity_email}
                                    </span>

                                    {/* Priority */}
                                    <span className={cn(
                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                        PRIORITY_STYLES[rule.priority],
                                    )}>
                                        {rule.priority}
                                    </span>

                                    {/* Toggle */}
                                    <button
                                        onClick={() => toggleRule(rule)}
                                        disabled={togglingId === rule.id}
                                        title={rule.is_active ? 'Desactivar' : 'Activar'}
                                        className="text-muted transition-colors hover:text-primary disabled:opacity-50"
                                    >
                                        {togglingId === rule.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : rule.is_active ? (
                                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                                        ) : (
                                            <ToggleLeft className="h-5 w-5" />
                                        )}
                                    </button>

                                    {/* Edit */}
                                    <button
                                        onClick={() => {
                                            setEditingId(editingId === rule.id ? null : rule.id);
                                            setShowCreate(false);
                                        }}
                                        className={cn(
                                            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                                            editingId === rule.id
                                                ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30'
                                                : 'text-muted hover:bg-surface-tertiary hover:text-primary',
                                        )}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Delete */}
                                    {confirmDeleteId === rule.id ? (
                                        <span className="flex items-center gap-1 text-xs">
                                            <span className="text-muted">¿Eliminar?</span>
                                            <button
                                                onClick={() => deleteRule(rule.id)}
                                                disabled={deletingId === rule.id}
                                                className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                            >
                                                {deletingId === rule.id
                                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                                    : 'Sí'}
                                            </button>
                                            <span className="text-muted">/</span>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="text-muted hover:text-secondary"
                                            >
                                                No
                                            </button>
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteId(rule.id)}
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}

                                    {/* Expand chevron */}
                                    <ChevronDown className={cn(
                                        'h-4 w-4 shrink-0 text-muted transition-transform',
                                        editingId === rule.id && 'rotate-180',
                                    )} />
                                </div>

                                {/* Subject preview when collapsed */}
                                {editingId !== rule.id && (
                                    <div className="border-t border-default px-4 pb-3 pt-2">
                                        <p className="text-xs text-muted">
                                            <span className="font-medium text-secondary">Asunto:</span>{' '}
                                            {rule.subject_template}
                                        </p>
                                    </div>
                                )}

                                {/* Edit form inline */}
                                <AnimatePresence>
                                    {editingId === rule.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.18 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-default p-4">
                                                <RuleForm
                                                    rule={rule}
                                                    incidentTypes={incident_types}
                                                    onCancel={() => setEditingId(null)}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

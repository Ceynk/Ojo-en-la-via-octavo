import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    ChevronDown, Loader2, Building2, UserPlus, Users as UsersIcon, Mail, MailX, Globe,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import { FlashMessages } from '@/components/ui/alert';
import { cn, getStorageUrl } from '@/lib/utils';
import type { PageProps, Entity, IncidentType } from '@/types';

interface EntitiesProps extends PageProps {
    entities: Entity[];
    incident_types: IncidentType[];
}

const PRIORITY_STYLES: Record<string, string> = {
    alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    baja:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

/* ── Entity form (create or edit) ───────────────────────────── */
function EntityForm({
    entity,
    incidentTypes,
    onCancel,
}: {
    entity?: Entity;
    incidentTypes: IncidentType[];
    onCancel: () => void;
}) {
    const isEdit = !!entity;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name:               entity?.name ?? '',
        description:        entity?.description ?? '',
        entity_email:       entity?.entity_email ?? '',
        subject_template:   entity?.subject_template ?? '',
        message_template:   entity?.message_template ?? '',
        priority:           entity?.priority ?? 'media' as 'alta' | 'media' | 'baja',
        incident_type_ids:  entity?.incident_types?.map((t) => t.id) ?? [] as number[],
    });

    function toggleType(id: number) {
        setData('incident_type_ids',
            data.incident_type_ids.includes(id)
                ? data.incident_type_ids.filter((t) => t !== id)
                : [...data.incident_type_ids, id],
        );
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit) {
            put(`/admin/entities/${entity.id}`, {
                onSuccess: () => { reset(); onCancel(); },
            });
        } else {
            post('/admin/entities', {
                onSuccess: () => { reset(); onCancel(); },
            });
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-xs font-medium text-secondary">
                        Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Secretaría de Infraestructura"
                        className="w-full rounded-lg border border-default bg-surface-secondary py-2 px-3 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-secondary">Descripción</label>
                    <input
                        type="text"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder="Huecos, malla vial, obras civiles…"
                        className="w-full rounded-lg border border-default bg-surface-secondary py-2 px-3 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    />
                    {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
                </div>

                <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-secondary">
                        Correo de contacto{' '}
                        <span className="text-muted">
                            (requerido mientras la entidad esté activa; puede quedar vacío si sigue inactiva)
                        </span>
                    </label>
                    <input
                        type="email"
                        value={data.entity_email}
                        onChange={(e) => setData('entity_email', e.target.value)}
                        placeholder="contacto@entidad.gov.co"
                        className="w-full rounded-lg border border-default bg-surface-secondary py-2 px-3 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    />
                    {errors.entity_email && <p className="mt-1 text-xs text-red-600">{errors.entity_email}</p>}
                </div>
            </div>

            {/* Incident types */}
            <div>
                <label className="mb-2 block text-xs font-medium text-secondary">
                    Tipos de incidente que le aplican a esta entidad
                </label>
                <div className="flex flex-wrap gap-2">
                    {incidentTypes.map((t) => {
                        const active = data.incident_type_ids.includes(t.id);
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleType(t.id)}
                                className={cn(
                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    active
                                        ? 'border-brand-600 bg-brand-600 text-white'
                                        : 'border-default bg-surface-secondary text-secondary hover:bg-surface-tertiary',
                                )}
                            >
                                {t.name}
                            </button>
                        );
                    })}
                </div>
                {errors.incident_type_ids && <p className="mt-1 text-xs text-red-600">{errors.incident_type_ids}</p>}
            </div>

            {/* Subject template */}
            <div>
                <label className="mb-1 block text-xs font-medium text-secondary">
                    Asunto del email{' '}
                    <span className="text-muted">
                        (variables: {'{tipo}'}, {'{reporte_id}'}, {'{id}'}, {'{direccion}'}, {'{descripcion}'})
                    </span>
                </label>
                <input
                    type="text"
                    value={data.subject_template}
                    onChange={(e) => setData('subject_template', e.target.value)}
                    maxLength={300}
                    placeholder="Nuevo reporte de {tipo} en Villavicencio"
                    className="w-full rounded-lg border border-default bg-surface-secondary py-2 px-3 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                />
                {errors.subject_template && <p className="mt-1 text-xs text-red-600">{errors.subject_template}</p>}
            </div>

            {/* Message template */}
            <div>
                <label className="mb-1 block text-xs font-medium text-secondary">
                    Mensaje{' '}
                    <span className="text-muted">
                        (variables: {'{tipo}'}, {'{descripcion}'}, {'{direccion}'}, {'{reporte_id}'}, {'{id}'})
                    </span>
                </label>
                <textarea
                    value={data.message_template}
                    onChange={(e) => setData('message_template', e.target.value)}
                    rows={4}
                    placeholder="Se ha registrado un nuevo incidente de tipo {tipo}…"
                    className="w-full resize-none rounded-lg border border-default bg-surface-secondary px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                />
                {errors.message_template && <p className="mt-1 text-xs text-red-600">{errors.message_template}</p>}
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
                {errors.priority && <p className="mt-1 text-xs text-red-600">{errors.priority}</p>}
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
                    {isEdit ? 'Guardar cambios' : 'Crear entidad'}
                </button>
            </div>
        </form>
    );
}

/* ── Entity users panel ──────────────────────────────────────── */
function EntityUsers({ entity }: { entity: Entity }) {
    const [showInvite, setShowInvite] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/admin/entities/${entity.id}/users`, {
            onSuccess: () => { reset(); setShowInvite(false); },
        });
    }

    function toggleUser(userId: number) {
        router.patch(`/admin/entities/users/${userId}/toggle`);
    }

    const users = entity.users ?? [];

    return (
        <div className="space-y-3 border-t border-default p-4">
            <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
                    <UsersIcon className="h-3.5 w-3.5" />
                    Usuarios de la entidad ({users.length})
                </h4>
                <button
                    type="button"
                    onClick={() => setShowInvite((v) => !v)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:hover:bg-brand-950/30"
                >
                    <UserPlus className="h-3.5 w-3.5" />
                    {showInvite ? 'Cancelar' : 'Nuevo usuario'}
                </button>
            </div>

            {users.length > 0 && (
                <ul className="space-y-1">
                    {users.map((u) => (
                        <li key={u.id} className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-1.5 text-xs">
                            <span className="text-primary">
                                {u.first_name} {u.last_name} <span className="text-muted">({u.email})</span>
                            </span>
                            <button
                                onClick={() => toggleUser(u.id)}
                                title={u.is_active ? 'Desactivar' : 'Activar'}
                                className="text-muted transition-colors hover:text-primary"
                            >
                                {u.is_active
                                    ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                                    : <ToggleLeft className="h-4 w-4" />}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <AnimatePresence>
                {showInvite && (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={submit}
                        className="grid gap-2 overflow-hidden rounded-lg bg-surface-secondary p-3 sm:grid-cols-2"
                    >
                        <div>
                            <input
                                type="text"
                                value={data.first_name}
                                onChange={(e) => setData('first_name', e.target.value)}
                                placeholder="Nombre"
                                className="w-full rounded-lg border border-default bg-surface-primary py-1.5 px-2.5 text-xs text-primary placeholder:text-muted outline-none focus:border-brand-500"
                            />
                            {errors.first_name && <p className="mt-1 text-[10px] text-red-600">{errors.first_name}</p>}
                        </div>
                        <div>
                            <input
                                type="text"
                                value={data.last_name}
                                onChange={(e) => setData('last_name', e.target.value)}
                                placeholder="Apellido"
                                className="w-full rounded-lg border border-default bg-surface-primary py-1.5 px-2.5 text-xs text-primary placeholder:text-muted outline-none focus:border-brand-500"
                            />
                            {errors.last_name && <p className="mt-1 text-[10px] text-red-600">{errors.last_name}</p>}
                        </div>
                        <div>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="Correo"
                                className="w-full rounded-lg border border-default bg-surface-primary py-1.5 px-2.5 text-xs text-primary placeholder:text-muted outline-none focus:border-brand-500"
                            />
                            {errors.email && <p className="mt-1 text-[10px] text-red-600">{errors.email}</p>}
                        </div>
                        <div>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                placeholder="Teléfono"
                                className="w-full rounded-lg border border-default bg-surface-primary py-1.5 px-2.5 text-xs text-primary placeholder:text-muted outline-none focus:border-brand-500"
                            />
                            {errors.phone && <p className="mt-1 text-[10px] text-red-600">{errors.phone}</p>}
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                            >
                                {processing && <Loader2 className="h-3 w-3 animate-spin" />}
                                Crear usuario
                            </button>
                        </div>
                        <p className="sm:col-span-2 text-[10px] text-muted">
                            Se enviará un correo de invitación para que el usuario establezca su propia contraseña.
                        </p>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function EntitiesIndex() {
    const { entities, incident_types } = usePage<EntitiesProps>().props;
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [usersOpenId, setUsersOpenId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    function toggleEntity(entity: Entity) {
        if (togglingId) return;
        setTogglingId(entity.id);
        router.patch(`/admin/entities/${entity.id}/toggle`, {}, {
            onFinish: () => setTogglingId(null),
        });
    }

    function deleteEntity(id: number) {
        if (deletingId) return;
        setDeletingId(id);
        router.delete(`/admin/entities/${id}`, {
            onFinish: () => { setDeletingId(null); setConfirmDeleteId(null); },
        });
    }

    return (
        <AdminLayout
            title="Entidades"
            breadcrumbs={[{ label: 'Entidades' }]}
        >
            <Head title="Entidades — Admin" />

            <div className="space-y-4">
                <FlashMessages />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">
                        {entities.length} entidad{entities.length !== 1 ? 'es' : ''} configurada{entities.length !== 1 ? 's' : ''}
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
                        {showCreate ? 'Cancelar' : 'Nueva entidad'}
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
                                    <Building2 className="h-4 w-4 text-brand-600" />
                                    Nueva entidad
                                </h3>
                                <EntityForm
                                    incidentTypes={incident_types}
                                    onCancel={() => setShowCreate(false)}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Entities list */}
                {entities.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-default py-16 text-center"
                    >
                        <Building2 className="h-10 w-10 text-muted/30" />
                        <p className="text-sm font-medium text-secondary">Sin entidades configuradas</p>
                        <p className="text-xs text-muted">Crea una entidad para empezar a notificarle reportes</p>
                    </motion.div>
                ) : (
                    <div className="space-y-2">
                        {entities.map((entity, i) => (
                            <motion.div
                                key={entity.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)]"
                            >
                                {/* Entity header */}
                                <div className="flex flex-wrap items-center gap-3 p-4">
                                    {entity.logo_path ? (
                                        <img
                                            src={getStorageUrl(entity.logo_path)}
                                            alt=""
                                            className="h-7 w-7 shrink-0 rounded-full bg-white object-contain ring-1 ring-default"
                                        />
                                    ) : (
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-tertiary">
                                            <Building2 className="h-3.5 w-3.5 text-muted" />
                                        </div>
                                    )}

                                    <span className="flex-1 truncate text-sm font-medium text-primary">
                                        {entity.name}
                                    </span>

                                    <span className="text-[11px] text-muted">
                                        {(entity.incident_types?.length ?? 0)} tipo{(entity.incident_types?.length ?? 0) !== 1 ? 's' : ''}
                                    </span>

                                    <span className={cn(
                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                        PRIORITY_STYLES[entity.priority],
                                    )}>
                                        {entity.priority}
                                    </span>

                                    {!entity.is_active && (
                                        <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-semibold text-muted">
                                            inactiva
                                        </span>
                                    )}

                                    {/* Users toggle */}
                                    <button
                                        onClick={() => setUsersOpenId(usersOpenId === entity.id ? null : entity.id)}
                                        title="Usuarios de la entidad"
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                                            usersOpenId === entity.id
                                                ? 'border-brand-300 bg-brand-100 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300'
                                                : (entity.users?.length ?? 0) === 0
                                                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                                                    : 'border-default text-secondary hover:bg-surface-tertiary hover:text-primary',
                                        )}
                                    >
                                        <UsersIcon className="h-3.5 w-3.5" />
                                        {(entity.users?.length ?? 0) === 0
                                            ? 'Sin usuarios · Crear'
                                            : `${entity.users?.length} usuario${entity.users?.length === 1 ? '' : 's'}`}
                                    </button>

                                    {/* Active toggle */}
                                    <button
                                        onClick={() => toggleEntity(entity)}
                                        disabled={togglingId === entity.id}
                                        title={entity.is_active ? 'Desactivar' : 'Activar'}
                                        className="text-muted transition-colors hover:text-primary disabled:opacity-50"
                                    >
                                        {togglingId === entity.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : entity.is_active ? (
                                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                                        ) : (
                                            <ToggleLeft className="h-5 w-5" />
                                        )}
                                    </button>

                                    {/* Edit */}
                                    <button
                                        onClick={() => {
                                            setEditingId(editingId === entity.id ? null : entity.id);
                                            setShowCreate(false);
                                        }}
                                        className={cn(
                                            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                                            editingId === entity.id
                                                ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30'
                                                : 'text-muted hover:bg-surface-tertiary hover:text-primary',
                                        )}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Delete */}
                                    {confirmDeleteId === entity.id ? (
                                        <span className="flex items-center gap-1 text-xs">
                                            <span className="text-muted">¿Eliminar?</span>
                                            <button
                                                onClick={() => deleteEntity(entity.id)}
                                                disabled={deletingId === entity.id}
                                                className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                            >
                                                {deletingId === entity.id
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
                                            onClick={() => setConfirmDeleteId(entity.id)}
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}

                                    {/* Expand chevron */}
                                    <ChevronDown className={cn(
                                        'h-4 w-4 shrink-0 text-muted transition-transform',
                                        editingId === entity.id && 'rotate-180',
                                    )} />
                                </div>

                                {/* Description + incident type chips when collapsed */}
                                {editingId !== entity.id && (
                                    <div className="border-t border-default px-4 pb-3 pt-2">
                                        {entity.motto && (
                                            <p className="mb-1.5 text-xs font-medium italic text-secondary">"{entity.motto}"</p>
                                        )}
                                        {entity.description && (
                                            <p className="mb-1.5 text-xs text-muted">{entity.description}</p>
                                        )}
                                        {entity.website_url && (
                                            <a
                                                href={entity.website_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mb-1.5 flex items-center gap-1.5 text-xs text-brand-600 hover:underline"
                                            >
                                                <Globe className="h-3 w-3 shrink-0" />
                                                {entity.website_url}
                                            </a>
                                        )}
                                        <p className={cn(
                                            'mb-1.5 flex items-center gap-1.5 text-xs',
                                            entity.entity_email ? 'text-secondary' : 'text-muted italic',
                                        )}>
                                            {entity.entity_email ? (
                                                <Mail className="h-3 w-3 shrink-0" />
                                            ) : (
                                                <MailX className="h-3 w-3 shrink-0" />
                                            )}
                                            {entity.entity_email ?? 'Sin correo de contacto configurado'}
                                        </p>
                                        {entity.incident_types && entity.incident_types.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {entity.incident_types.map((t) => (
                                                    <span key={t.id} className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] text-secondary">
                                                        {t.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Edit form inline */}
                                <AnimatePresence>
                                    {editingId === entity.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.18 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-default p-4">
                                                <EntityForm
                                                    entity={entity}
                                                    incidentTypes={incident_types}
                                                    onCancel={() => setEditingId(null)}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Users panel */}
                                <AnimatePresence>
                                    {usersOpenId === entity.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.18 }}
                                            className="overflow-hidden"
                                        >
                                            <EntityUsers entity={entity} />
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

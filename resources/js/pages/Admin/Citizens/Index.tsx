import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Search, UserCheck, UserX, FileText, MapPin,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import UserAvatar from '@/components/shared/UserAvatar';
import { FlashMessages } from '@/components/ui/alert';
import { formatRelativeTime, GENDER_LABELS } from '@/lib/utils';
import type { PageProps, PaginatedData, User } from '@/types';

interface CitizensProps extends PageProps {
    citizens: PaginatedData<User>;
    filters: { search?: string };
}

export default function CitizensIndex() {
    const { citizens, filters } = usePage<CitizensProps>().props;
    const [search, setSearch] = useState(filters.search ?? '');

    function applySearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/admin/citizens', { search }, { preserveState: true, replace: true });
    }

    const { data: citizenList, current_page, last_page, links } = citizens;

    return (
        <AdminLayout
            title="Ciudadanos"
            breadcrumbs={[{ label: 'Ciudadanos' }]}
        >
            <Head title="Ciudadanos — Admin" />

            <div className="space-y-6">
                <FlashMessages />

                <div className="page-heading">
                    <div>
                        <p className="text-sm text-secondary">Directorio de personas registradas</p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">Ciudadanos</h2>
                    </div>
                    <span className="rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-200">
                        {citizens.total.toLocaleString('es-CO')} registrados
                    </span>
                </div>

                <form onSubmit={applySearch} className="surface-panel flex flex-col gap-3 rounded-[var(--radius-card)] p-4 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, email o documento…"
                            className="h-11 w-full rounded-[var(--radius-button)] border border-default bg-slate-950/55 py-2 pl-9 pr-4 text-sm text-primary placeholder:text-muted outline-none transition-colors focus:border-brand-400/70 focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>
                    <button
                        type="submit"
                        className="h-11 rounded-[var(--radius-button)] bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/25 transition-colors hover:bg-brand-500"
                    >
                        Buscar
                    </button>
                    {filters.search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                router.get('/admin/citizens', {}, { replace: true });
                            }}
                            className="h-11 rounded-[var(--radius-button)] border border-default px-4 text-sm font-semibold text-secondary transition-colors hover:bg-surface-tertiary hover:text-primary"
                        >
                            Limpiar
                        </button>
                    )}
                </form>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="table-shell"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-default bg-slate-950/70 text-left">
                                    <th className="whitespace-nowrap px-5 py-4">Ciudadano</th>
                                    <th className="whitespace-nowrap px-5 py-4">Documento</th>
                                    <th className="whitespace-nowrap px-5 py-4">Teléfono</th>
                                    <th className="whitespace-nowrap px-5 py-4">Dirección</th>
                                    <th className="whitespace-nowrap px-5 py-4">Barrio</th>
                                    <th className="whitespace-nowrap px-5 py-4">Nacimiento</th>
                                    <th className="whitespace-nowrap px-5 py-4">Género</th>
                                    <th className="whitespace-nowrap px-5 py-4 text-center">Reportes</th>
                                    <th className="whitespace-nowrap px-5 py-4">Registro</th>
                                    <th className="whitespace-nowrap px-5 py-4">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-default">
                                {citizenList.map((citizen, index) => (
                                    <tr key={citizen.id} className={index % 2 === 0 ? 'bg-slate-900/35' : 'bg-slate-950/20'}>
                                        {/* Avatar + name + email */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar id={citizen.id} name={citizen.name} profilePhoto={citizen.profile_photo} size="md" />
                                                <div>
                                                    <p className="whitespace-nowrap font-semibold text-primary">{citizen.name}</p>
                                                    <p className="mt-0.5 whitespace-nowrap text-xs text-muted">{citizen.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3.5 text-secondary">
                                            {citizen.document_type && citizen.document_number ? (
                                                <>
                                                    <span className="font-medium">{citizen.document_type}</span>{' '}
                                                    {citizen.document_number}
                                                </>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3.5 text-secondary">{citizen.phone || <span className="text-muted">—</span>}</td>

                                        <td className="max-w-[220px] px-5 py-3.5 text-secondary">
                                            {citizen.address ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${citizen.address}, ${citizen.neighborhood ?? ''} Villavicencio, Meta, Colombia`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center gap-1 text-brand-300 transition-colors hover:text-brand-200 hover:underline"
                                                >
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    {citizen.address}
                                                </a>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3.5 text-secondary">{citizen.neighborhood || <span className="text-muted">—</span>}</td>

                                        <td className="whitespace-nowrap px-5 py-3.5 text-secondary">
                                            {citizen.birth_date || <span className="text-muted">—</span>}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3.5 text-secondary">
                                            {citizen.gender ? GENDER_LABELS[citizen.gender] : <span className="text-muted">—</span>}
                                        </td>

                                        <td className="px-5 py-3.5 text-center">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-200">
                                                <FileText className="h-3 w-3" />
                                                {citizen.reports_count ?? 0}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-muted">
                                            {formatRelativeTime(citizen.created_at)}
                                        </td>

                                        <td className="px-5 py-3.5">
                                            <span className={
                                                citizen.is_active
                                                    ? 'flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300'
                                                    : 'flex w-fit items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300'
                                            }>
                                                {citizen.is_active ? (
                                                    <UserCheck className="h-3 w-3" />
                                                ) : (
                                                    <UserX className="h-3 w-3" />
                                                )}
                                                {citizen.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {citizenList.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-5 py-12 text-center text-sm text-muted">
                                            No se encontraron ciudadanos
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-default px-5 py-3">
                            <p className="text-xs text-muted">
                                Página {current_page} de {last_page}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => router.get(links[0].url ?? '')}
                                    disabled={!links[0].url}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-default text-muted transition-colors hover:bg-surface-tertiary disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => router.get(links[links.length - 1].url ?? '')}
                                    disabled={!links[links.length - 1].url}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-default text-muted transition-colors hover:bg-surface-tertiary disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AdminLayout>
    );
}

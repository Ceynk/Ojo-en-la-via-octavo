import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Search, UserCheck, UserX, FileText, MapPin,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
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

            <div className="space-y-4">
                <FlashMessages />

                {/* Search bar */}
                <form onSubmit={applySearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, email o documento…"
                            className="w-full rounded-lg border border-default bg-surface-primary py-2 pl-9 pr-4 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
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
                            className="rounded-lg border border-default px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface-tertiary"
                        >
                            Limpiar
                        </button>
                    )}
                </form>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-default bg-surface-primary shadow-[var(--shadow-card)] overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-default bg-surface-secondary text-left text-xs text-muted">
                                    <th className="px-5 py-3 font-medium">Ciudadano</th>
                                    <th className="px-5 py-3 font-medium">Documento</th>
                                    <th className="px-5 py-3 font-medium">Teléfono</th>
                                    <th className="px-5 py-3 font-medium">Dirección</th>
                                    <th className="px-5 py-3 font-medium">Barrio</th>
                                    <th className="px-5 py-3 font-medium">Nacimiento</th>
                                    <th className="px-5 py-3 font-medium">Género</th>
                                    <th className="px-5 py-3 font-medium text-center">Reportes</th>
                                    <th className="px-5 py-3 font-medium">Registro</th>
                                    <th className="px-5 py-3 font-medium">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-default">
                                {citizenList.map((citizen) => (
                                    <tr key={citizen.id} className="transition-colors hover:bg-surface-secondary">
                                        {/* Avatar + name + email */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                                    {citizen.name[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-primary">{citizen.name}</p>
                                                    <p className="text-xs text-muted">{citizen.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-3 text-secondary">
                                            {citizen.document_type && citizen.document_number ? (
                                                <>
                                                    <span className="font-medium">{citizen.document_type}</span>{' '}
                                                    {citizen.document_number}
                                                </>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>

                                        <td className="px-5 py-3 text-secondary">{citizen.phone || <span className="text-muted">—</span>}</td>

                                        <td className="px-5 py-3 text-secondary">
                                            {citizen.address ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${citizen.address}, ${citizen.neighborhood ?? ''} Villavicencio, Meta, Colombia`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 hover:underline"
                                                >
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    {citizen.address}
                                                </a>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>

                                        <td className="px-5 py-3 text-secondary">{citizen.neighborhood || <span className="text-muted">—</span>}</td>

                                        <td className="whitespace-nowrap px-5 py-3 text-secondary">
                                            {citizen.birth_date || <span className="text-muted">—</span>}
                                        </td>

                                        <td className="px-5 py-3 text-secondary">
                                            {citizen.gender ? GENDER_LABELS[citizen.gender] : <span className="text-muted">—</span>}
                                        </td>

                                        <td className="px-5 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-secondary">
                                                <FileText className="h-3 w-3" />
                                                {citizen.reports_count ?? 0}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3 text-muted text-xs">
                                            {formatRelativeTime(citizen.created_at)}
                                        </td>

                                        <td className="px-5 py-3">
                                            <span className={
                                                citizen.is_active
                                                    ? 'flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'flex w-fit items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400'
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

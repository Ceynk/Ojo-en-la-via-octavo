import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Search, UserCheck, UserX, ShieldCheck, Shield,
    ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import AdminLayout from '@/components/shared/AdminLayout';
import { FlashMessages } from '@/components/ui/alert';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { PageProps, PaginatedData, User } from '@/types';

interface UsersProps extends PageProps {
    users: PaginatedData<User>;
    filters: { search?: string };
}

export default function UsersIndex() {
    const { users, filters } = usePage<UsersProps>().props;
    const [search, setSearch] = useState(filters.search ?? '');
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [changingRoleId, setChangingRoleId] = useState<number | null>(null);

    function applySearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/admin/users', { search }, { preserveState: true, replace: true });
    }

    function toggleUser(user: User) {
        if (togglingId) return;
        setTogglingId(user.id);
        router.patch(
            `/admin/users/${user.id}/toggle`,
            {},
            { onFinish: () => setTogglingId(null) },
        );
    }

    function changeRole(user: User, role: 'ciudadano' | 'admin') {
        if (changingRoleId) return;
        setChangingRoleId(user.id);
        router.patch(
            `/admin/users/${user.id}/role`,
            { role },
            { onFinish: () => setChangingRoleId(null) },
        );
    }

    const { data: userList, current_page, last_page, links } = users;

    return (
        <AdminLayout
            title="Usuarios"
            breadcrumbs={[{ label: 'Usuarios' }]}
        >
            <Head title="Usuarios — Admin" />

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
                            placeholder="Buscar por nombre o email…"
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
                                router.get('/admin/users', {}, { replace: true });
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
                                    <th className="px-5 py-3 font-medium">Usuario</th>
                                    <th className="px-5 py-3 font-medium">Teléfono</th>
                                    <th className="px-5 py-3 font-medium text-center">Reportes</th>
                                    <th className="px-5 py-3 font-medium">Registro</th>
                                    <th className="px-5 py-3 font-medium">Estado</th>
                                    <th className="px-5 py-3 font-medium">Rol</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-default">
                                {userList.map((user) => (
                                    <tr key={user.id} className="transition-colors hover:bg-surface-secondary">
                                        {/* Avatar + name + email */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                                                    {user.name[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-primary">{user.name}</p>
                                                    <p className="text-xs text-muted">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-3 text-secondary">{user.phone || '—'}</td>

                                        <td className="px-5 py-3 text-center">
                                            <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-secondary">
                                                {user.reports_count ?? 0}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-3 text-muted text-xs">
                                            {formatRelativeTime(user.created_at)}
                                        </td>

                                        {/* Toggle active */}
                                        <td className="px-5 py-3">
                                            <button
                                                onClick={() => user.role !== 'admin' && toggleUser(user)}
                                                disabled={user.role === 'admin' || togglingId === user.id}
                                                title={user.role === 'admin' ? 'No puedes editar cuentas de administrador' : undefined}
                                                className={cn(
                                                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                                                    user.is_active
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-red-100 text-red-700 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-red-900/30 dark:text-red-400',
                                                    'disabled:cursor-not-allowed disabled:opacity-60',
                                                )}
                                            >
                                                {togglingId === user.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : user.is_active ? (
                                                    <UserCheck className="h-3 w-3" />
                                                ) : (
                                                    <UserX className="h-3 w-3" />
                                                )}
                                                {user.is_active ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>

                                        {/* Change role */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                                    user.role === 'admin'
                                                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                                                        : 'bg-surface-tertiary text-muted',
                                                )}>
                                                    {user.role === 'admin' ? (
                                                        <ShieldCheck className="h-2.5 w-2.5" />
                                                    ) : (
                                                        <Shield className="h-2.5 w-2.5" />
                                                    )}
                                                    {user.role}
                                                </span>
                                                {user.role !== 'admin' && (
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => changeRole(user, e.target.value as 'ciudadano' | 'admin')}
                                                        disabled={changingRoleId === user.id}
                                                        className="rounded border border-default bg-surface-primary py-0.5 pl-1 pr-5 text-[11px] text-secondary outline-none focus:border-brand-500 disabled:opacity-50"
                                                    >
                                                        <option value="ciudadano" className="bg-white text-gray-900">ciudadano</option>
                                                        <option value="admin" className="bg-white text-gray-900">admin</option>
                                                    </select>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {userList.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted">
                                            No se encontraron usuarios
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

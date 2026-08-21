import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, Building2, LayoutDashboard, MapPin, UserCircle, Users } from 'lucide-react';
import type { PageProps } from '@/types';
import SidebarLayout, { SidebarNavGroup } from './SidebarLayout';
import NotificationPanel from './NotificationPanel';

interface EntityLayoutProps {
    children: React.ReactNode;
    entityName?: string;
    breadcrumb?: string;
}

const navGroups: SidebarNavGroup[] = [
    {
        label: 'Principal',
        items: [
            { href: '/entidad/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ],
    },
    {
        label: 'Operadores',
        items: [
            { href: '/entidad/operadores', label: 'Operadores', icon: Users },
            { href: '/entidad/mapa-operadores', label: 'Mapa en vivo', icon: MapPin },
        ],
    },
    {
        label: 'Cuenta',
        items: [
            { href: '/entidad/perfil', label: 'Mi perfil', icon: UserCircle },
            { href: '/entidad/info', label: 'Información de la entidad', icon: Building2 },
        ],
    },
];

export default function EntityLayout({ children, entityName, breadcrumb }: EntityLayoutProps) {
    const { notifications_count } = usePage<PageProps>().props;
    const [notifOpen, setNotifOpen] = useState(false);

    return (
        <SidebarLayout
            navGroups={navGroups}
            brandSubtitle={
                <>
                    <p>Panel de entidad</p>
                    {entityName && (
                        <p className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {entityName}
                        </p>
                    )}
                </>
            }
            breadcrumbs={breadcrumb ? [{ label: breadcrumb }] : undefined}
            headerRight={
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setNotifOpen((o) => !o)}
                        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary"
                        aria-label="Notificaciones"
                    >
                        <Bell className="h-4 w-4" />
                        {notifications_count > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                                {notifications_count > 9 ? '9+' : notifications_count}
                            </span>
                        )}
                    </button>

                    <NotificationPanel
                        open={notifOpen}
                        onClose={() => setNotifOpen(false)}
                        onReportOpen={(id) => router.visit(`/entidad/reportes/${id}`)}
                    />
                </div>
            }
        >
            {children}
        </SidebarLayout>
    );
}

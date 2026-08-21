import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, LayoutDashboard, UserCircle } from 'lucide-react';
import type { PageProps } from '@/types';
import SidebarLayout, { SidebarNavGroup } from './SidebarLayout';
import NotificationPanel from './NotificationPanel';

interface OperatorLayoutProps {
    children: React.ReactNode;
    breadcrumb?: string;
    fullBleed?: boolean;
}

const navGroups: SidebarNavGroup[] = [
    {
        label: 'Principal',
        items: [
            { href: '/operador/dashboard', label: 'Cola de reportes', icon: LayoutDashboard },
        ],
    },
    {
        label: 'Cuenta',
        items: [
            { href: '/operador/perfil', label: 'Mi perfil', icon: UserCircle },
        ],
    },
];

export default function OperatorLayout({ children, breadcrumb, fullBleed }: OperatorLayoutProps) {
    const { notifications_count } = usePage<PageProps>().props;
    const [notifOpen, setNotifOpen] = useState(false);

    return (
        <SidebarLayout
            navGroups={navGroups}
            brandSubtitle="Panel de operador"
            breadcrumbs={breadcrumb ? [{ label: breadcrumb }] : undefined}
            fullBleed={fullBleed}
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
                        onReportOpen={(id) => router.visit(`/operador/reportes/${id}`)}
                    />
                </div>
            }
        >
            {children}
        </SidebarLayout>
    );
}

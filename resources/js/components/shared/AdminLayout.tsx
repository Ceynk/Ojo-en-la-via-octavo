import React from 'react';
import {
    LayoutDashboard,
    FileText,
    Users,
    BarChart3,
    Bell,
    Download,
    IdCard,
    Building2,
} from 'lucide-react';
import SidebarLayout, { SidebarNavGroup } from './SidebarLayout';

interface AdminLayoutProps {
    children: React.ReactNode;
    title?: string;
    breadcrumbs?: { label: string; href?: string }[];
}

const navGroups: SidebarNavGroup[] = [
    {
        label: 'Principal',
        items: [
            { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/admin/analytics', label: 'Analítica', icon: BarChart3 },
        ],
    },
    {
        label: 'Gestión',
        items: [
            { href: '/admin/reports', label: 'Reportes', icon: FileText },
            { href: '/admin/users', label: 'Usuarios', icon: Users },
            { href: '/admin/citizens', label: 'Ciudadanos', icon: IdCard },
        ],
    },
    {
        label: 'Configuración',
        items: [
            { href: '/admin/entities', label: 'Entidades', icon: Building2 },
            { href: '/admin/notifications', label: 'Notificaciones', icon: Bell },
            { href: '/admin/export', label: 'Exportar', icon: Download },
        ],
    },
];

export default function AdminLayout({ children, title, breadcrumbs }: AdminLayoutProps) {
    return (
        <SidebarLayout
            navGroups={navGroups}
            brandSubtitle="Panel Admin"
            title={title}
            breadcrumbs={breadcrumbs}
        >
            {children}
        </SidebarLayout>
    );
}

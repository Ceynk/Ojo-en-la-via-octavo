import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    FileText,
    Users,
    BarChart3,
    Bell,
    Settings,
    LogOut,
    MapPin,
    Menu,
    Download,
    ChevronRight,
    Moon,
    Sun,
} from 'lucide-react';
import type { PageProps } from '@/types';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
    children: React.ReactNode;
    title?: string;
    breadcrumbs?: { label: string; href?: string }[];
}

const navGroups = [
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
        ],
    },
    {
        label: 'Configuración',
        items: [
            { href: '/admin/rules', label: 'Reglas', icon: Settings },
            { href: '/admin/notifications', label: 'Notificaciones', icon: Bell },
            { href: '/admin/export', label: 'Exportar', icon: Download },
        ],
    },
];

export default function AdminLayout({ children, title, breadcrumbs }: AdminLayoutProps) {
    const { auth } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                (!localStorage.getItem('theme') &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const SidebarContent = () => (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-default px-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600">
                    <MapPin className="h-4 w-4 text-white" />
                </div>
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                    >
                        <p className="text-sm font-bold text-primary whitespace-nowrap">Ojo en la Vía</p>
                        <p className="text-xs text-muted">Panel Admin</p>
                    </motion.div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-2">
                {navGroups.map((group) => (
                    <div key={group.label} className="mb-6">
                        {!collapsed && (
                            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                                {group.label}
                            </p>
                        )}
                        <div className="flex flex-col gap-0.5">
                            {group.items.map(({ href, label, icon: Icon }) => {
                                const isActive = currentPath.startsWith(href);
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                                            isActive
                                                ? 'bg-brand-600 text-white shadow-sm'
                                                : 'text-secondary hover:bg-surface-tertiary hover:text-primary',
                                        )}
                                        title={collapsed ? label : undefined}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {!collapsed && <span>{label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-default p-3">
                <div className={cn('flex items-center gap-3 rounded-lg p-2', collapsed && 'justify-center')}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold dark:bg-brand-900 dark:text-brand-300">
                        {auth.user?.name.charAt(0).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-primary">{auth.user?.name}</p>
                            <p className="truncate text-xs text-muted">{auth.user?.email}</p>
                        </div>
                    )}
                </div>
                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className={cn(
                        'mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20',
                        collapsed && 'justify-center',
                    )}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!collapsed && 'Cerrar sesión'}
                </Link>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-surface-secondary">
            {/* Desktop sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 64 : 240 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="relative hidden shrink-0 border-r border-default bg-surface-primary lg:flex lg:flex-col overflow-hidden"
            >
                <SidebarContent />
                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-default bg-surface-primary shadow-sm transition-colors hover:bg-surface-tertiary"
                >
                    <ChevronRight
                        className={cn('h-3 w-3 text-muted transition-transform', collapsed && 'rotate-180')}
                    />
                </button>
            </motion.aside>

            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: -240 }}
                            animate={{ x: 0 }}
                            exit={{ x: -240 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed left-0 top-0 z-50 h-full w-60 border-r border-default bg-surface-primary lg:hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex h-16 items-center gap-4 border-b border-default bg-surface-primary px-4 lg:px-6">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary lg:hidden"
                    >
                        <Menu className="h-4 w-4" />
                    </button>

                    <div className="flex-1">
                        {breadcrumbs && breadcrumbs.length > 0 && (
                            <nav className="flex items-center gap-1 text-sm text-muted">
                                {breadcrumbs.map((crumb, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && <ChevronRight className="h-3 w-3" />}
                                        {crumb.href ? (
                                            <Link href={crumb.href} className="hover:text-primary transition-colors">
                                                {crumb.label}
                                            </Link>
                                        ) : (
                                            <span className="text-primary font-medium">{crumb.label}</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </nav>
                        )}
                        {title && !breadcrumbs && (
                            <h1 className="text-base font-semibold text-primary">{title}</h1>
                        )}
                    </div>

                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary"
                    >
                        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="min-h-full p-4 lg:p-6"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}

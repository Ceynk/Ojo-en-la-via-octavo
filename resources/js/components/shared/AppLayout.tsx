import React, { useState, useEffect, useCallback } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Bell, User, LogOut, AlertTriangle, Menu, X, Moon, Sun, RefreshCw,
} from 'lucide-react';
import type { PageProps, ReportStatus } from '@/types';
import NotificationPanel from './NotificationPanel';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { usePrivateChannel } from '@/hooks/useEcho';
import { STATUS_LABELS } from '@/lib/utils';

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
}

interface LiveToast {
    id: number;
    message: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
    const { auth, notifications_count } = usePage<PageProps>().props;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const [liveToast, setLiveToast] = useState<LiveToast | null>(null);

    const privateChannel = auth.user ? `user.${auth.user.id}` : null;

    const handleStatusChanged = useCallback((data: unknown) => {
        const d = data as { status: ReportStatus; description: string };
        setLiveToast({
            id:      Date.now(),
            message: `Tu reporte cambió a "${STATUS_LABELS[d.status]}"`,
        });
        setTimeout(() => setLiveToast(null), 5000);
        router.reload({ only: ['notifications_count'] });
    }, []);

    usePrivateChannel(privateChannel, 'report.status.changed', handleStatusChanged);
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

    const navItems = [
        { href: '/inicio', label: 'Mapa', icon: MapPin },
        { href: '/reportes', label: 'Reportes', icon: AlertTriangle },
        { href: '/perfil', label: 'Perfil', icon: User },
    ];

    return (
        <div className="min-h-screen bg-surface-secondary">
            {/* Top navbar */}
            <header className="sticky top-0 z-40 border-b border-default bg-surface-primary/80 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo */}
                        <Link href="/inicio" className="flex items-center gap-2 group">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-sm transition-transform group-hover:scale-105">
                                <MapPin className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-base font-bold text-primary">Ojo en la Vía</span>
                        </Link>

                        {/* Desktop nav */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-tertiary hover:text-primary"
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Link>
                            ))}
                        </nav>

                        {/* Right actions */}
                        <div className="flex items-center gap-2">
                            {/* Dark mode toggle */}
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary"
                                aria-label="Toggle dark mode"
                            >
                                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </button>

                            {/* Notification bell */}
                            <div className="relative">
                                <button
                                    onClick={() => setNotifOpen((o) => !o)}
                                    className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary"
                                    aria-label="Notificaciones"
                                >
                                    <Bell className="h-4 w-4" />
                                    {notifications_count > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white"
                                        >
                                            {notifications_count > 9 ? '9+' : notifications_count}
                                        </motion.span>
                                    )}
                                </button>

                                <NotificationPanel
                                    open={notifOpen}
                                    onClose={() => setNotifOpen(false)}
                                    onReportOpen={(id) => setSelectedReportId(id)}
                                />
                            </div>

                            {/* Logout — desktop */}
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="hidden md:flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-tertiary hover:text-primary"
                            >
                                <LogOut className="h-4 w-4" />
                                Salir
                            </Link>

                            {/* Mobile menu toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary md:hidden"
                            >
                                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-default md:hidden"
                        >
                            <nav className="flex flex-col gap-1 px-4 py-3">
                                {navItems.map(({ href, label, icon: Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-surface-tertiary hover:text-primary"
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </Link>
                                ))}
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Cerrar sesión
                                </Link>
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Real-time status toast */}
            <AnimatePresence>
                {liveToast && (
                    <motion.div
                        key={liveToast.id}
                        initial={{ opacity: 0, y: -16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                        className="fixed left-1/2 top-20 z-[9999] -translate-x-1/2"
                    >
                        <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 shadow-[var(--shadow-elevated)] dark:border-brand-800 dark:bg-brand-950/80">
                            <RefreshCw className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                            <p className="text-xs font-medium text-brand-800 dark:text-brand-200">
                                {liveToast.message}
                            </p>
                            <button
                                onClick={() => setLiveToast(null)}
                                className="ml-1 text-brand-400 hover:text-brand-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Page content */}
            <main>
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                    {children}
                </motion.div>
            </main>

            {/* Global report drawer — opened from notifications */}
            <ReportDrawer
                reportId={selectedReportId}
                onClose={() => setSelectedReportId(null)}
            />
        </div>
    );
}

import React, { useState, useCallback } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
    MapPin, Bell, User, LogOut, AlertTriangle, Menu, X, RefreshCw,
} from 'lucide-react';
import type { PageProps, ReportStatus } from '@/types';
import NotificationPanel from './NotificationPanel';
import ReportDrawer from '@/components/reports/ReportDrawer';
import { usePrivateChannel } from '@/hooks/useEcho';
import { STATUS_LABELS } from '@/lib/utils';
import LogoutModal from './LogoutModal';

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
    const queryClient = useQueryClient();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const [liveToast, setLiveToast] = useState<LiveToast | null>(null);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);

    const privateChannel = auth.user ? `user.${auth.user.id}` : null;

    const handleStatusChanged = useCallback((data: unknown) => {
        const d = data as { id: number; status: ReportStatus; description: string };
        setLiveToast({
            id:      Date.now(),
            message: `Tu reporte cambió a "${STATUS_LABELS[d.status]}"`,
        });
        setTimeout(() => setLiveToast(null), 5000);
        router.reload({ only: ['notifications_count'] });
        queryClient.invalidateQueries({ queryKey: ['report', d.id] });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
    }, [queryClient]);

    usePrivateChannel(privateChannel, 'report.status.changed', handleStatusChanged);

    const navItems = [
        { href: '/inicio', label: 'Mapa', icon: MapPin },
        { href: '/reportes', label: 'Reportes', icon: AlertTriangle },
        { href: '/perfil', label: 'Perfil', icon: User },
    ];

    return (
        <div className="min-h-screen bg-surface-secondary">
            {/* Top navbar */}
            {/* z-[900]: the header is `sticky`, which makes it its own stacking context — anything
                inside it (like the notification dropdown) is capped at whatever z-index the header
                itself has, regardless of its own z-index. Must clear the map page's overlays
                (toolbar/panels top out around z-600) or dropdowns here render behind them. */}
            <header className="sticky top-0 z-[900] border-b border-default bg-surface-primary/80 backdrop-blur-sm">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo */}
                        <Link href="/inicio" className="flex items-center gap-2 group">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm transition-transform group-hover:scale-105">
                                <img src="/Logos/logo-1-icon.png" alt="Ojo en la Vía" className="h-6 w-6 object-contain" />
                            </div>
                            <span className="text-base font-bold text-primary">Ojo en la Vía</span>
                        </Link>

                        {/* Nav + actions, grouped together on the right so the header doesn't feel hollow in the middle */}
                        <div className="flex items-center gap-1 md:gap-6">
                            {/* Desktop nav */}
                            <nav className="hidden items-center gap-1 md:flex">
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

                            {/* Divider between nav and actions */}
                            <span className="hidden h-6 w-px bg-white/10 md:block" />

                            {/* Right actions */}
                            <div className="flex items-center gap-2">
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
                                <button
                                    type="button"
                                    onClick={() => setLogoutModalOpen(true)}
                                    className="hidden md:flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-tertiary hover:text-primary"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Salir
                                </button>

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
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        setLogoutModalOpen(true);
                                    }}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Cerrar sesión
                                </button>
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
                {/* opacity-only: a `y`/scale animation here would apply a CSS transform to this
                    wrapper, which makes it the containing block for every `position: fixed`
                    descendant on the page (drawers, modals, lightboxes) instead of the viewport. */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
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

            <LogoutModal
                open={logoutModalOpen}
                onClose={() => setLogoutModalOpen(false)}
                userName={auth.user?.name}
            />
        </div>
    );
}

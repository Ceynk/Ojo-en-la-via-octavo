import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { PageProps } from '@/types';
import { cn } from '@/lib/utils';
import LogoutModal from './LogoutModal';

export interface SidebarNavItem {
    href: string;
    label: string;
    icon: React.ElementType;
}

export interface SidebarNavGroup {
    label: string;
    items: SidebarNavItem[];
}

interface SidebarLayoutProps {
    children: React.ReactNode;
    navGroups: SidebarNavGroup[];
    brandSubtitle: React.ReactNode;
    title?: string;
    breadcrumbs?: { label: string; href?: string }[];
    headerRight?: React.ReactNode;
    /** Drops the default content padding/scroll-fade so a page (e.g. a full-screen map) can fill the entire main area, matching AppLayout's unpadded <main>. */
    fullBleed?: boolean;
}

/**
 * Shared collapsible-sidebar shell used by both the Admin and Entity panels —
 * keep them visually identical by changing this file, not by duplicating it.
 */
export default function SidebarLayout({
    children, navGroups, brandSubtitle, title, breadcrumbs, headerRight, fullBleed = false,
}: SidebarLayoutProps) {
    const { auth } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(true);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const SidebarContent = () => (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                    <img src="/Logos/logo-1-icon.png" alt="Ojo en la Vía" className="h-7 w-7 object-contain" />
                </div>
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                    >
                        <p className="text-sm font-bold text-white tracking-tight whitespace-nowrap">Ojo en la Vía</p>
                        <div className="text-[11px] font-medium text-amber-400">{brandSubtitle}</div>
                    </motion.div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-2">
                {navGroups.map((group) => (
                    <div key={group.label} className="mb-6">
                        {!collapsed && (
                            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {group.label}
                            </p>
                        )}
                        <div className="flex flex-col gap-1">
                            {group.items.map(({ href, label, icon: Icon }) => {
                                const isActive = currentPath.startsWith(href);
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                                            isActive
                                                ? 'border border-brand-500/40 bg-brand-500/20 text-brand-300 font-semibold shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                                                : 'text-slate-300 hover:bg-white/10 hover:text-white',
                                        )}
                                        title={collapsed ? label : undefined}
                                    >
                                        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-400' : 'text-slate-400')} />
                                        {!collapsed && <span>{label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-white/10 p-3">
                <div className={cn('flex items-center gap-3 rounded-xl p-2 bg-white/5 border border-white/5', collapsed && 'justify-center')}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/25 border border-brand-500/40 text-brand-300 text-xs font-bold shadow-[0_0_10px_rgba(37,99,235,0.25)]">
                        {auth.user?.name.charAt(0).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-semibold text-white">{auth.user?.name}</p>
                            <p className="truncate text-xs text-slate-400">{auth.user?.email}</p>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setLogoutModalOpen(true)}
                    className={cn(
                        'mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10',
                        collapsed && 'justify-center',
                    )}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!collapsed && 'Cerrar sesión'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-surface-secondary">
            {/* Desktop sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 64 : 240 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="relative hidden shrink-0 border-r border-white/10 bg-slate-950/85 backdrop-blur-xl lg:flex lg:flex-col"
            >
                <div className="h-full overflow-hidden">
                    <SidebarContent />
                </div>
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
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: -240 }}
                            animate={{ x: 0 }}
                            exit={{ x: -240 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed left-0 top-0 z-50 h-full w-60 border-r border-white/10 bg-slate-950/95 backdrop-blur-2xl lg:hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex h-16 items-center gap-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-4 lg:px-6">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                    >
                        <Menu className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? 'Expandir panel' : 'Retraer panel'}
                        className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:flex"
                    >
                        {collapsed ? (
                            <PanelLeftOpen className="h-[18px] w-[18px]" />
                        ) : (
                            <PanelLeftClose className="h-[18px] w-[18px]" />
                        )}
                    </button>

                    <div className="flex-1">
                        {breadcrumbs && breadcrumbs.length > 0 && (
                            <nav className="flex items-center gap-1.5 text-sm text-slate-400">
                                {breadcrumbs.map((crumb, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                                        {crumb.href ? (
                                            <Link href={crumb.href} className="hover:text-white transition-colors">
                                                {crumb.label}
                                            </Link>
                                        ) : (
                                            <span className="text-white font-semibold">{crumb.label}</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </nav>
                        )}
                        {title && !breadcrumbs && (
                            <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
                        )}
                    </div>

                    {headerRight}
                </header>

                {/* Page content */}
                <main className={cn('flex-1', fullBleed ? 'overflow-hidden' : 'overflow-y-auto')}>
                    {fullBleed ? (
                        children
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="min-h-full p-4 lg:p-6"
                        >
                            {children}
                        </motion.div>
                    )}
                </main>
            </div>

            <LogoutModal
                open={logoutModalOpen}
                onClose={() => setLogoutModalOpen(false)}
                userName={auth.user?.name}
            />
        </div>
    );
}

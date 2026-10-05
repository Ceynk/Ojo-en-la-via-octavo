import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
    children: React.ReactNode;
    eyebrow: string;
    tagline?: React.ReactNode;
    footer?: React.ReactNode;
    wide?: boolean;
}

export default function AuthLayout({ children, eyebrow, tagline, footer, wide = false }: AuthLayoutProps) {
    return (
        <div
            className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-12"
            style={{ backgroundImage: "url('/Fondo/fondo-login.png')" }}
        >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/70" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn('relative w-full', wide ? 'max-w-2xl' : 'max-w-md')}
            >
                <div className="overflow-hidden rounded-3xl border border-white/15 bg-slate-900/85 shadow-2xl backdrop-blur-2xl">
                    <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-brand-500 to-emerald-400" />

                    <div className={cn('py-10', wide ? 'px-6 sm:px-10' : 'px-8')}>
                        <div className="flex flex-col items-center text-center">
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-[0_0_30px_rgba(37,99,235,0.35)] ring-1 ring-white/40">
                                <img src="/Logos/logo-1-icon.png" alt="Ojo en la Vía" className="h-[4.2rem] w-[4.2rem] object-contain drop-shadow" />
                            </div>
                            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
                                OJO EN LA VÍA
                            </h1>
                            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold tracking-wider text-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                VILLAVICENCIO
                            </div>
                            {tagline && (
                                <p className="mt-2 text-sm text-slate-300">{tagline}</p>
                            )}
                        </div>

                        <div className="my-7 flex items-center gap-3">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
                            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                                {eyebrow}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
                        </div>

                        {children}

                        {footer && (
                            <p className="mt-7 text-center text-xs text-slate-400">
                                {footer}
                            </p>
                        )}
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-white/40">
                    © {new Date().getFullYear()} Ojo en la Vía · Villavicencio
                </p>
            </motion.div>
        </div>
    );
}

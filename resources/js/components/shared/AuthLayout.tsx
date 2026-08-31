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
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-brand-400 to-brand-600" />

                    <div className={cn('py-10', wide ? 'px-6 sm:px-10' : 'px-8')}>
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
                                <img src="/Logos/logo-1-icon.png" alt="Ojo en la Vía" className="h-[4.5rem] w-[4.5rem] object-contain" />
                            </div>
                            <h1 className="mt-4 text-xl font-bold tracking-wide text-white">
                                OJO EN LA VÍA
                            </h1>
                            <p className="text-sm font-semibold tracking-wide text-brand-300">
                                VILLAVICENCIO
                            </p>
                            {tagline && (
                                <p className="mt-1 text-sm text-white/70">{tagline}</p>
                            )}
                        </div>

                        <div className="my-7 flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/20" />
                            <span className="text-xs font-semibold tracking-widest text-white/60">
                                {eyebrow}
                            </span>
                            <div className="h-px flex-1 bg-white/20" />
                        </div>

                        {children}

                        {footer && (
                            <p className="mt-7 text-center text-xs text-white/50">
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

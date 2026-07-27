import React from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: React.ReactNode;
}

const stats = [
    { value: '+500', label: 'Reportes activos' },
    { value: '85%', label: 'Tasa de resolución' },
    { value: '+1.2k', label: 'Ciudadanos' },
];

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen bg-surface-secondary">
            {/* Left panel — branding */}
            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 p-12 text-white relative overflow-hidden"
            >
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-brand-900/40 blur-3xl" />
                </div>

                <div className="relative flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold">Ojo en la Vía</span>
                </div>

                <div className="relative">
                    <h1 className="text-4xl font-bold leading-tight mb-4">
                        Juntos mejoramos<br />nuestra ciudad
                    </h1>
                    <p className="text-brand-200 text-lg leading-relaxed max-w-md">
                        Reporta incidentes viales en Villavicencio y ayuda a las
                        entidades a responder más rápido.
                    </p>
                </div>

                <div className="relative flex items-center gap-6">
                    {stats.map((stat, i) => (
                        <React.Fragment key={stat.label}>
                            {i > 0 && <div className="h-10 w-px bg-brand-700" />}
                            <div className="flex flex-col gap-0.5">
                                <span className="text-3xl font-bold text-white">{stat.value}</span>
                                <span className="text-sm text-brand-300">{stat.label}</span>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </motion.div>

            {/* Right panel — content */}
            <div className="flex flex-1 items-center justify-center px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile logo */}
                    <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
                            <MapPin className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-primary">Ojo en la Vía</span>
                    </Link>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-primary">{title}</h2>
                        {subtitle && <div className="mt-1.5 text-secondary text-sm">{subtitle}</div>}
                    </div>

                    {children}
                </motion.div>
            </div>
        </div>
    );
}

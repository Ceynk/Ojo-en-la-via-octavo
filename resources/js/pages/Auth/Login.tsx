import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlassInput } from '@/components/shared/GlassInput';
import { FlashMessages } from '@/components/ui/alert';
import AuthLayout from '@/components/shared/AuthLayout';
import type { PageProps } from '@/types';

interface LoginProps extends PageProps {
    redirect?: string | null;
}

export default function Login() {
    const { flash, redirect } = usePage<LoginProps>().props;
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
        redirect: redirect ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/login');
    }

    return (
        <AuthLayout
            eyebrow="INICIAR SESIÓN"
            tagline="Reporta y sigue incidentes viales en tu ciudad"
            footer={
                <>
                    ¿No tienes cuenta?{' '}
                    <Link href="/register" className="font-medium text-brand-300 hover:underline">
                        Regístrate gratis
                    </Link>
                </>
            }
        >
            <Head title="Iniciar sesión" />

            <FlashMessages success={flash.success} error={flash.error} className="mb-6" />

            <form onSubmit={submit} className="flex flex-col gap-5">
                <GlassInput
                    label="Correo electrónico"
                    icon={Mail}
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    error={errors.email}
                    autoComplete="email"
                    required
                />

                <GlassInput
                    label="Contraseña"
                    icon={Lock}
                    type={showPassword ? 'text' : 'password'}
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="••••••••"
                    error={errors.password}
                    autoComplete="current-password"
                    required
                    rightElement={
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    }
                />

                <div className="flex items-center justify-between text-sm">
                    <label className="flex cursor-pointer select-none items-center gap-2 text-white/70">
                        <input
                            type="checkbox"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="h-4 w-4 rounded border-white/30 bg-white/10 accent-brand-500"
                        />
                        Recordarme
                    </label>
                    <Link
                        href="/forgot-password"
                        className="text-brand-300 hover:text-brand-200 hover:underline"
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                <Button
                    type="submit"
                    size="lg"
                    loading={processing}
                    className="mt-1 w-full bg-gradient-to-r from-brand-500 to-brand-600 shadow-lg shadow-brand-900/30 hover:from-brand-600 hover:to-brand-700"
                >
                    <Lock className="h-4 w-4" />
                    Ingresar al sistema
                </Button>
            </form>
        </AuthLayout>
    );
}

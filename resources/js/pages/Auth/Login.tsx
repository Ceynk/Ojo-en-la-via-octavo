import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FlashMessages } from '@/components/ui/alert';
import AuthLayout from '@/components/shared/AuthLayout';
import type { PageProps } from '@/types';

export default function Login() {
    const { flash } = usePage<PageProps>().props;
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/login');
    }

    return (
        <AuthLayout
            title="Bienvenido de vuelta"
            subtitle={
                <>
                    ¿No tienes cuenta?{' '}
                    <Link href="/register" className="text-brand-600 font-medium hover:underline">
                        Regístrate gratis
                    </Link>
                </>
            }
        >
            <Head title="Iniciar sesión" />

            <FlashMessages
                success={flash.success}
                error={flash.error}
                className="mb-6"
            />

            <form onSubmit={submit} className="flex flex-col gap-5">
                <Input
                    label="Correo electrónico"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="tu@email.com"
                    error={errors.email}
                    autoComplete="email"
                    required
                />

                <div className="flex flex-col gap-1.5">
                    <div className="relative">
                        <Input
                            label="Contraseña"
                            type={showPassword ? 'text' : 'password'}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="••••••••"
                            error={errors.password}
                            autoComplete="current-password"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-9 text-muted hover:text-primary transition-colors"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showPassword
                                ? <EyeOff className="h-4 w-4" />
                                : <Eye className="h-4 w-4" />
                            }
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-sm text-brand-600 hover:underline"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        className="h-4 w-4 rounded border-default accent-brand-600"
                    />
                    <span className="text-sm text-secondary">Recordarme por 30 días</span>
                </label>

                <Button type="submit" size="lg" loading={processing} className="w-full mt-1">
                    Iniciar sesión
                </Button>
            </form>
        </AuthLayout>
    );
}

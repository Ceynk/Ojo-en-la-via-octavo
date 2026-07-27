import { Head, useForm, Link } from '@inertiajs/react';
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import AuthLayout from '@/components/shared/AuthLayout';

interface Props {
    token: string;
    email?: string;
}

export default function ResetPassword({ token, email = '' }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, wasSuccessful } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/reset-password');
    }

    if (wasSuccessful) {
        return (
            <AuthLayout title="¡Contraseña actualizada!">
                <Head title="Contraseña restablecida" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-6 py-4 text-center"
                >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <ShieldCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-primary font-medium text-lg">Contraseña restablecida</p>
                        <p className="mt-1 text-sm text-secondary">
                            Ya puedes iniciar sesión con tu nueva contraseña.
                        </p>
                    </div>
                    <Link href="/login">
                        <Button size="lg">Ir al inicio de sesión</Button>
                    </Link>
                </motion.div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Nueva contraseña"
            subtitle="Elige una contraseña segura para tu cuenta."
        >
            <Head title="Restablecer contraseña" />

            {errors.email && (
                <Alert variant="error" message={errors.email} className="mb-6" />
            )}

            <form onSubmit={submit} className="flex flex-col gap-5">
                <input type="hidden" name="token" value={data.token} />

                {!email && (
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
                )}

                <div className="relative">
                    <Input
                        label="Nueva contraseña"
                        type={showPassword ? 'text' : 'password'}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        error={errors.password}
                        hint="Debe incluir mayúsculas, minúsculas y números"
                        autoComplete="new-password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-muted hover:text-primary transition-colors"
                        aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>

                <div className="relative">
                    <Input
                        label="Confirmar contraseña"
                        type={showConfirm ? 'text' : 'password'}
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        placeholder="Repite tu contraseña"
                        error={errors.password_confirmation}
                        autoComplete="new-password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-9 text-muted hover:text-primary transition-colors"
                        aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                    >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>

                {/* Match indicator */}
                {data.password_confirmation && (
                    <p className={`text-xs ${
                        data.password === data.password_confirmation
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500'
                    }`}>
                        {data.password === data.password_confirmation
                            ? '✓ Las contraseñas coinciden'
                            : '· Las contraseñas no coinciden'
                        }
                    </p>
                )}

                <Button
                    type="submit"
                    size="lg"
                    loading={processing}
                    disabled={
                        processing ||
                        !data.password ||
                        data.password !== data.password_confirmation
                    }
                    className="w-full mt-1"
                >
                    Guardar nueva contraseña
                </Button>

                <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesión
                </Link>
            </form>
        </AuthLayout>
    );
}

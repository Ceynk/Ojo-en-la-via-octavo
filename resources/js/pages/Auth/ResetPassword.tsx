import { Head, useForm, Link } from '@inertiajs/react';
import { Eye, EyeOff, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GlassInput } from '@/components/shared/GlassInput';
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
            <AuthLayout eyebrow="CONTRASEÑA ACTUALIZADA">
                <Head title="Contraseña restablecida" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-6 py-4 text-center"
                >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15">
                        <ShieldCheck className="h-10 w-10 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-lg font-medium text-white">Contraseña restablecida</p>
                        <p className="mt-1 text-sm text-white/60">
                            Ya puedes iniciar sesión con tu nueva contraseña.
                        </p>
                    </div>
                    <Link href="/login">
                        <Button
                            size="lg"
                            className="bg-gradient-to-r from-brand-500 to-brand-600 shadow-lg shadow-brand-900/30 hover:from-brand-600 hover:to-brand-700"
                        >
                            Ir al inicio de sesión
                        </Button>
                    </Link>
                </motion.div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            eyebrow="NUEVA CONTRASEÑA"
            tagline="Elige una contraseña segura para tu cuenta"
        >
            <Head title="Restablecer contraseña" />

            {errors.email && (
                <Alert variant="error" message={errors.email} className="mb-6" />
            )}

            <form onSubmit={submit} className="flex flex-col gap-5">
                <input type="hidden" name="token" value={data.token} />

                {!email && (
                    <GlassInput
                        label="Correo electrónico"
                        icon={Lock}
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="tu@email.com"
                        error={errors.email}
                        autoComplete="email"
                        required
                    />
                )}

                <GlassInput
                    label="Nueva contraseña"
                    icon={Lock}
                    type={showPassword ? 'text' : 'password'}
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    error={errors.password}
                    hint="Debe incluir mayúsculas, minúsculas y números"
                    autoComplete="new-password"
                    required
                    rightElement={
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
                            aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    }
                />

                <GlassInput
                    label="Confirmar contraseña"
                    icon={Lock}
                    type={showConfirm ? 'text' : 'password'}
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    placeholder="Repite tu contraseña"
                    error={errors.password_confirmation}
                    autoComplete="new-password"
                    required
                    rightElement={
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
                            aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                        >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    }
                />

                {/* Match indicator */}
                {data.password_confirmation && (
                    <p className={`text-xs ${
                        data.password === data.password_confirmation
                            ? 'text-emerald-400'
                            : 'text-red-300'
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
                    className="mt-1 w-full bg-gradient-to-r from-brand-500 to-brand-600 shadow-lg shadow-brand-900/30 hover:from-brand-600 hover:to-brand-700"
                >
                    Guardar nueva contraseña
                </Button>

                <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesión
                </Link>
            </form>
        </AuthLayout>
    );
}

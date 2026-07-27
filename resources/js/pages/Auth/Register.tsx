import { Head, useForm, Link } from '@inertiajs/react';
import { Eye, EyeOff, User, Phone, Mail, Lock } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/components/shared/AuthLayout';

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
};

const item = {
    hidden: { opacity: 0, y: 12 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name:     '',
        phone:    '',
        email:    '',
        password: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/register');
    }

    return (
        <AuthLayout
            title="Crea tu cuenta"
            subtitle={
                <>
                    ¿Ya tienes cuenta?{' '}
                    <Link href="/login" className="text-brand-600 font-medium hover:underline">
                        Inicia sesión
                    </Link>
                </>
            }
        >
            <Head title="Registro" />

            <motion.form
                variants={container}
                initial="hidden"
                animate="show"
                onSubmit={submit}
                className="flex flex-col gap-4"
            >
                <motion.div variants={item}>
                    <div className="relative">
                        <Input
                            label="Nombre completo"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="María García"
                            error={errors.name}
                            autoComplete="name"
                            required
                        />
                        <User className="absolute right-3 top-9 h-4 w-4 text-muted pointer-events-none" />
                    </div>
                </motion.div>

                <motion.div variants={item}>
                    <div className="relative">
                        <Input
                            label="Teléfono"
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="3001234567"
                            error={errors.phone}
                            hint="Solo dígitos, sin espacios ni guiones"
                            autoComplete="tel"
                            required
                        />
                        <Phone className="absolute right-3 top-9 h-4 w-4 text-muted pointer-events-none" />
                    </div>
                </motion.div>

                <motion.div variants={item}>
                    <div className="relative">
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
                        <Mail className="absolute right-3 top-9 h-4 w-4 text-muted pointer-events-none" />
                    </div>
                </motion.div>

                <motion.div variants={item}>
                    <div className="relative">
                        <Input
                            label="Contraseña"
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
                            {showPassword
                                ? <EyeOff className="h-4 w-4" />
                                : <Eye className="h-4 w-4" />
                            }
                        </button>
                    </div>
                </motion.div>

                {/* Password strength indicator */}
                <motion.div variants={item}>
                    <PasswordStrength password={data.password} />
                </motion.div>

                <motion.div variants={item}>
                    <Button
                        type="submit"
                        size="lg"
                        loading={processing}
                        className="w-full mt-2"
                    >
                        Crear cuenta gratis
                    </Button>
                </motion.div>

                <motion.p variants={item} className="text-center text-xs text-muted">
                    Al registrarte aceptas nuestros{' '}
                    <span className="text-brand-600 cursor-pointer hover:underline">Términos de uso</span>
                    {' '}y la{' '}
                    <span className="text-brand-600 cursor-pointer hover:underline">Política de privacidad</span>.
                </motion.p>
            </motion.form>
        </AuthLayout>
    );
}

function PasswordStrength({ password }: { password: string }) {
    if (!password) return null;

    const checks = [
        { label: '8+ caracteres', ok: password.length >= 8 },
        { label: 'Mayúscula',     ok: /[A-Z]/.test(password) },
        { label: 'Minúscula',     ok: /[a-z]/.test(password) },
        { label: 'Número',        ok: /\d/.test(password) },
    ];

    const passed = checks.filter(c => c.ok).length;
    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'];

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            i < passed ? colors[passed - 1] : 'bg-surface-tertiary'
                        }`}
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {checks.map(({ label, ok }) => (
                    <span
                        key={label}
                        className={`text-xs transition-colors ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'}`}
                    >
                        {ok ? '✓' : '·'} {label}
                    </span>
                ))}
            </div>
        </div>
    );
}

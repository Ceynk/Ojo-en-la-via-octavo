import { Head, useForm, Link } from '@inertiajs/react';
import { Eye, EyeOff, User, Phone, Mail, Lock, IdCard, Hash, MapPin, Home, Cake, Users as UsersIcon, Check, X } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GlassInput } from '@/components/shared/GlassInput';
import AuthLayout from '@/components/shared/AuthLayout';
import { cn } from '@/lib/utils';

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};

const item = {
    hidden: { opacity: 0, y: 12 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const DOCUMENT_TYPES = [
    { value: 'CC', label: 'Cédula de ciudadanía' },
    { value: 'TI', label: 'Tarjeta de identidad' },
    { value: 'CE', label: 'Cédula de extranjería' },
    { value: 'PA', label: 'Pasaporte' },
];

const GENDERS = [
    { value: 'masculino', label: 'Masculino' },
    { value: 'femenino', label: 'Femenino' },
    { value: 'otro', label: 'Otro' },
    { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
];

interface GlassSelectProps {
    label: string;
    icon: React.ElementType;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    error?: string;
}

function GlassSelect({ label, icon: Icon, value, onChange, options, placeholder, error }: GlassSelectProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/90">{label}</label>
            <div className="relative">
                <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                    className={cn(
                        'h-11 w-full appearance-none rounded-lg border border-white/15 bg-black/20 pl-10 pr-3 text-sm text-white outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-brand-400',
                        !value && 'text-white/40',
                        error && 'ring-2 ring-red-400/60',
                    )}
                >
                    <option value="" disabled className="bg-gray-900 text-white/40">{placeholder}</option>
                    {options.map((o) => (
                        <option key={o.value} value={o.value} className="bg-gray-900 text-white">
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>
            {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
    );
}

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        document_type: '',
        document_number: '',
        address: '',
        neighborhood: '',
        birth_date: '',
        gender: '',
        password: '',
        password_confirmation: '',
    });

    const passwordsMatch = data.password_confirmation.length > 0 && data.password === data.password_confirmation;
    const passwordsMismatch = data.password_confirmation.length > 0 && data.password !== data.password_confirmation;

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/register');
    }

    return (
        <AuthLayout
            eyebrow="CREAR CUENTA"
            tagline="Únete y ayuda a mejorar la movilidad de tu ciudad"
            wide
            footer={
                <>
                    ¿Ya tienes cuenta?{' '}
                    <Link href="/login" className="font-medium text-brand-300 hover:underline">
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
                <div className="grid gap-4 sm:grid-cols-2">
                    <motion.div variants={item}>
                        <GlassInput
                            label="Nombres"
                            icon={User}
                            type="text"
                            value={data.first_name}
                            onChange={(e) => setData('first_name', e.target.value)}
                            placeholder="María"
                            error={errors.first_name}
                            autoComplete="given-name"
                            required
                        />
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassInput
                            label="Apellidos"
                            icon={User}
                            type="text"
                            value={data.last_name}
                            onChange={(e) => setData('last_name', e.target.value)}
                            placeholder="García Rojas"
                            error={errors.last_name}
                            autoComplete="family-name"
                            required
                        />
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassInput
                            label="Teléfono"
                            icon={Phone}
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="3001234567"
                            error={errors.phone}
                            hint="Solo dígitos, sin espacios ni guiones"
                            autoComplete="tel"
                            required
                        />
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassInput
                            label="Correo electrónico"
                            icon={Mail}
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="tu@email.com"
                            error={errors.email}
                            autoComplete="email"
                            required
                        />
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassSelect
                            label="Tipo de documento"
                            icon={IdCard}
                            value={data.document_type}
                            onChange={(v) => setData('document_type', v)}
                            options={DOCUMENT_TYPES}
                            placeholder="Selecciona un tipo"
                            error={errors.document_type}
                        />
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassInput
                            label="Número de documento"
                            icon={Hash}
                            type="text"
                            value={data.document_number}
                            onChange={(e) => setData('document_number', e.target.value)}
                            placeholder="1121983456"
                            error={errors.document_number}
                            autoComplete="off"
                            required
                        />
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassInput
                            label="Dirección"
                            icon={Home}
                            type="text"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            placeholder="Calle 13A #5-20"
                            error={errors.address}
                            autoComplete="street-address"
                            required
                        />
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassInput
                            label="Barrio"
                            icon={MapPin}
                            type="text"
                            value={data.neighborhood}
                            onChange={(e) => setData('neighborhood', e.target.value)}
                            placeholder="Bello Horizonte"
                            error={errors.neighborhood}
                            autoComplete="off"
                            required
                        />
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassInput
                            label="Fecha de nacimiento"
                            icon={Cake}
                            type="date"
                            value={data.birth_date}
                            onChange={(e) => setData('birth_date', e.target.value)}
                            error={errors.birth_date}
                            autoComplete="bday"
                            required
                        />
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassSelect
                            label="Género"
                            icon={UsersIcon}
                            value={data.gender}
                            onChange={(v) => setData('gender', v)}
                            options={GENDERS}
                            placeholder="Selecciona una opción"
                            error={errors.gender}
                        />
                    </motion.div>
                </div>

                <motion.div variants={item}>
                    <GlassInput
                        label="Contraseña"
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
                                {showPassword
                                    ? <EyeOff className="h-4 w-4" />
                                    : <Eye className="h-4 w-4" />
                                }
                            </button>
                        }
                    />
                </motion.div>

                {/* Password strength indicator */}
                <motion.div variants={item}>
                    <PasswordStrength password={data.password} />
                </motion.div>

                <motion.div variants={item}>
                    <GlassInput
                        label="Confirmar contraseña"
                        icon={Lock}
                        type={showPasswordConfirmation ? 'text' : 'password'}
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        placeholder="Repite tu contraseña"
                        error={errors.password_confirmation ?? (passwordsMismatch ? 'Las contraseñas no coinciden' : undefined)}
                        autoComplete="new-password"
                        required
                        className="pr-16"
                        rightElement={
                            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                                {passwordsMatch && <Check className="h-4 w-4 text-emerald-400" />}
                                {passwordsMismatch && <X className="h-4 w-4 text-red-400" />}
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                    className="text-white/50 transition-colors hover:text-white"
                                    aria-label={showPasswordConfirmation ? 'Ocultar' : 'Mostrar'}
                                >
                                    {showPasswordConfirmation
                                        ? <EyeOff className="h-4 w-4" />
                                        : <Eye className="h-4 w-4" />
                                    }
                                </button>
                            </div>
                        }
                    />
                </motion.div>

                <motion.div variants={item}>
                    <Button
                        type="submit"
                        size="lg"
                        loading={processing}
                        className="mt-2 w-full bg-gradient-to-r from-brand-500 to-brand-600 shadow-lg shadow-brand-900/30 hover:from-brand-600 hover:to-brand-700"
                    >
                        Crear cuenta gratis
                    </Button>
                </motion.div>

                <motion.p variants={item} className="text-center text-xs text-white/50">
                    Al registrarte aceptas nuestros{' '}
                    <span className="cursor-pointer text-brand-300 hover:underline">Términos de uso</span>
                    {' '}y la{' '}
                    <span className="cursor-pointer text-brand-300 hover:underline">Política de privacidad</span>.
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
                            i < passed ? colors[passed - 1] : 'bg-white/15'
                        }`}
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {checks.map(({ label, ok }) => (
                    <span
                        key={label}
                        className={`text-xs transition-colors ${ok ? 'text-emerald-400' : 'text-white/50'}`}
                    >
                        {ok ? '✓' : '·'} {label}
                    </span>
                ))}
            </div>
        </div>
    );
}

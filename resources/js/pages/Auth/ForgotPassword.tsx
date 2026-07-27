import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FlashMessages } from '@/components/ui/alert';
import AuthLayout from '@/components/shared/AuthLayout';
import type { PageProps } from '@/types';

export default function ForgotPassword() {
    const { flash } = usePage<PageProps>().props;

    const { data, setData, post, processing, errors, wasSuccessful } = useForm({
        email: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/forgot-password');
    }

    return (
        <AuthLayout
            title="Restablecer contraseña"
            subtitle="Ingresa tu correo y te enviaremos un enlace para recuperar el acceso."
        >
            <Head title="Olvidé mi contraseña" />

            <FlashMessages
                success={flash.success}
                error={flash.error}
                className="mb-6"
            />

            {wasSuccessful && flash.success ? (
                <div className="flex flex-col items-center gap-6 py-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <Mail className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-primary font-medium">Revisa tu bandeja de entrada</p>
                        <p className="mt-1 text-sm text-secondary">
                            Si el correo está registrado, recibirás el enlace en los próximos minutos.
                            Recuerda revisar también tu carpeta de spam.
                        </p>
                    </div>
                    <Link
                        href="/login"
                        className="flex items-center gap-2 text-sm text-brand-600 hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al inicio de sesión
                    </Link>
                </div>
            ) : (
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

                    <Button
                        type="submit"
                        size="lg"
                        loading={processing}
                        className="w-full"
                    >
                        <Send className="h-4 w-4" />
                        Enviar enlace de recuperación
                    </Button>

                    <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al inicio de sesión
                    </Link>
                </form>
            )}
        </AuthLayout>
    );
}

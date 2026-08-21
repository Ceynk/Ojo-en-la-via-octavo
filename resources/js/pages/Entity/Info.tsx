import { useRef, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Building2, Camera, Check, Globe, Loader2 } from 'lucide-react';
import EntityLayout from '@/components/shared/EntityLayout';
import { FlashMessages } from '@/components/ui/alert';
import { cn, getStorageUrl } from '@/lib/utils';
import type { Entity, PageProps } from '@/types';

interface EntityInfoPageProps extends PageProps {
    entity: Entity;
}

export default function EntityInfo() {
    const { entity } = usePage<EntityInfoPageProps>().props;

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const logoRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        motto: entity.motto ?? '',
        description: entity.description ?? '',
        website_url: entity.website_url ?? '',
        logo: null as File | null,
    });

    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('logo', file);
        if (file) setLogoPreview(URL.createObjectURL(file));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.put('/entidad/info', {
            forceFormData: true,
            onSuccess: () => setLogoPreview(null),
        });
    }

    const logoUrl = logoPreview ?? (entity.logo_path ? getStorageUrl(entity.logo_path) : null);

    return (
        <EntityLayout entityName={entity.name} breadcrumb="Información de la entidad">
            <Head title="Información de la entidad" />

            <div className="mx-auto max-w-2xl">
                <FlashMessages />

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl border border-default bg-surface-primary p-6 shadow-[var(--shadow-card)]"
                >
                    <p className="mb-6 text-sm text-muted">
                        Esta información es solo de tu entidad — el logo, el lema y el link se muestran en el panel de administración y ayudan a los ciudadanos a identificarlos.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt={entity.name}
                                        className="h-20 w-20 rounded-full bg-white object-contain ring-4 ring-surface-secondary"
                                    />
                                ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 ring-4 ring-surface-secondary dark:bg-brand-900/40">
                                        <Building2 className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => logoRef.current?.click()}
                                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-md transition-colors hover:bg-brand-700"
                                    title="Cambiar logo"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                </button>
                                <input
                                    ref={logoRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handleLogoChange}
                                />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-primary">Logo de la entidad</p>
                                <p className="text-xs text-muted">JPG, PNG o WEBP — máx 2MB</p>
                            </div>
                        </div>

                        <Field label="Lema" error={form.errors.motto}>
                            <input
                                type="text"
                                value={form.data.motto}
                                onChange={(e) => form.setData('motto', e.target.value)}
                                className={inputClass(!!form.errors.motto)}
                                placeholder="Ej: Agua y vida para Villavicencio"
                                maxLength={150}
                            />
                        </Field>

                        <Field label="Descripción" error={form.errors.description}>
                            <textarea
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                className={cn(inputClass(!!form.errors.description), 'min-h-24 resize-none')}
                                placeholder="Cuéntale a los ciudadanos qué hace tu entidad"
                                maxLength={1000}
                            />
                        </Field>

                        <Field label="Página web" error={form.errors.website_url}>
                            <div className="relative">
                                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                                <input
                                    type="url"
                                    value={form.data.website_url}
                                    onChange={(e) => form.setData('website_url', e.target.value)}
                                    className={cn(inputClass(!!form.errors.website_url), 'pl-9')}
                                    placeholder="https://tuentidad.gov.co"
                                />
                            </div>
                        </Field>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                        >
                            {form.processing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5" />
                            )}
                            Guardar cambios
                        </button>
                    </form>
                </motion.div>
            </div>
        </EntityLayout>
    );
}

function inputClass(hasError: boolean) {
    return cn(
        'w-full rounded-lg border px-3 py-2 text-sm text-primary outline-none transition-colors',
        'bg-surface-primary focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
        hasError ? 'border-red-400' : 'border-default',
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">{label}</label>
            {children}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

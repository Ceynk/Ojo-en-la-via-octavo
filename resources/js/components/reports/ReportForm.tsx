import { useEffect, useRef, useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { X, MapPin, Upload, ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

interface Coords {
    lat: number;
    lng: number;
    address: string;
}

interface ReportFormProps {
    coords: Coords | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ReportForm({ coords, onClose, onSuccess }: ReportFormProps) {
    const { incident_types } = usePage<PageProps>().props;
    const fileRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const form = useForm({
        incident_type_id: '' as string | number,
        description: '',
        latitude: '' as string | number,
        longitude: '' as string | number,
        address_text: '',
        image: null as File | null,
    });

    // Sync coordinates when the map selection changes
    useEffect(() => {
        if (coords) {
            form.setData((prev) => ({
                ...prev,
                latitude: coords.lat,
                longitude: coords.lng,
                address_text: coords.address,
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coords]);

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('image', file);
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
    }

    function removeImage() {
        form.setData('image', null);
        setPreviewUrl(null);
        if (fileRef.current) fileRef.current.value = '';
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/reports', {
            forceFormData: true,
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
        });
    }

    const hasCoords = coords !== null;

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-default px-5 py-4">
                <div>
                    <h2 className="text-base font-semibold text-primary">Registrar incidente</h2>
                    <p className="text-xs text-muted">
                        {hasCoords
                            ? 'Ubicación seleccionada en el mapa'
                            : 'Haz clic en el mapa para seleccionar la ubicación'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                {/* Coords indicator */}
                <div
                    className={cn(
                        'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs',
                        hasCoords
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
                    )}
                >
                    {hasCoords ? (
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {hasCoords
                        ? `${coords!.lat.toFixed(5)}, ${coords!.lng.toFixed(5)}`
                        : 'Sin ubicación — haz clic en el mapa'}
                </div>

                {/* Incident type */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-primary" htmlFor="incident_type_id">
                        Tipo de incidente *
                    </label>
                    <select
                        id="incident_type_id"
                        value={form.data.incident_type_id}
                        onChange={(e) => form.setData('incident_type_id', e.target.value)}
                        className={cn(
                            'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                            'bg-surface-primary text-primary',
                            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            form.errors.incident_type_id
                                ? 'border-red-400'
                                : 'border-default',
                        )}
                    >
                        <option value="">Seleccione un tipo</option>
                        {incident_types.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                    {form.errors.incident_type_id && (
                        <p className="text-xs text-red-500">{form.errors.incident_type_id}</p>
                    )}
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-primary" htmlFor="description">
                        Descripción *
                    </label>
                    <textarea
                        id="description"
                        rows={4}
                        value={form.data.description}
                        onChange={(e) => form.setData('description', e.target.value)}
                        placeholder="Describe el incidente con detalle…"
                        className={cn(
                            'w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                            'bg-surface-primary text-primary placeholder:text-muted',
                            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            form.errors.description ? 'border-red-400' : 'border-default',
                        )}
                    />
                    <div className="flex items-center justify-between">
                        {form.errors.description ? (
                            <p className="text-xs text-red-500">{form.errors.description}</p>
                        ) : (
                            <span />
                        )}
                        <span className="text-[10px] text-muted">{form.data.description.length}/800</span>
                    </div>
                </div>

                {/* Address text */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-primary" htmlFor="address_text">
                        Dirección / referencia *
                    </label>
                    <input
                        id="address_text"
                        type="text"
                        value={form.data.address_text}
                        onChange={(e) => form.setData('address_text', e.target.value)}
                        placeholder="Ej: Cra 30 con Calle 42, frente al parque"
                        className={cn(
                            'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                            'bg-surface-primary text-primary placeholder:text-muted',
                            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            form.errors.address_text ? 'border-red-400' : 'border-default',
                        )}
                    />
                    {form.errors.address_text && (
                        <p className="text-xs text-red-500">{form.errors.address_text}</p>
                    )}
                </div>

                {/* Image upload */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-primary">
                        Fotografía <span className="text-muted font-normal">(opcional)</span>
                    </label>

                    {previewUrl ? (
                        <div className="relative w-full overflow-hidden rounded-lg">
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="h-36 w-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={removeImage}
                                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className={cn(
                                'flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed py-6',
                                'text-muted transition-colors hover:border-brand-400 hover:text-brand-600',
                                form.errors.image ? 'border-red-400' : 'border-default',
                            )}
                        >
                            <Upload className="h-5 w-5" />
                            <span className="text-xs">Subir imagen</span>
                            <span className="text-[10px]">JPG, PNG, WEBP · máx 5 MB</span>
                        </button>
                    )}

                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageChange}
                    />
                    {form.errors.image && (
                        <p className="text-xs text-red-500">{form.errors.image}</p>
                    )}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={form.processing || !hasCoords}
                    className={cn(
                        'mt-auto flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold',
                        'bg-brand-600 text-white transition-colors hover:bg-brand-700',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                >
                    {form.processing ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Registrando…
                        </>
                    ) : (
                        <>
                            <ImageIcon className="h-4 w-4" />
                            Registrar incidente
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

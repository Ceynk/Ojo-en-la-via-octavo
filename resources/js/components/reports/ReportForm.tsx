import { useEffect, useRef, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { X, Camera, ImageIcon, Loader2, AlertTriangle, Sparkles, Info, Copy, MapPin } from 'lucide-react';
import { cn, getStorageUrl } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';
import type { PageProps } from '@/types';

interface AiSuggestion {
    suggested_incident_type_id: number | null;
    confidence: 'alta' | 'media' | 'baja' | null;
    photo_matches_category: boolean | null;
    warning_message: string | null;
}

interface DuplicateCandidate {
    report_id: number;
    similarity: number;
    distance_meters: number;
    description: string;
    photo_path: string | null;
    address_text: string;
    created_at: string;
}

interface MediaItem {
    id: string;
    file: File;
    kind: 'image' | 'video';
    previewUrl: string;
}

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
    const [compressing, setCompressing] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Catch hard failures (network errors, unhandled 500s) that don't come back
    // as Inertia validation errors, without losing the open form/drawer state.
    useEffect(() => {
        const offException = router.on('httpException', () => {
            setSubmitError('No se pudo registrar el incidente. Intenta de nuevo.');
            return false;
        });
        const offNetwork = router.on('networkError', () => {
            setSubmitError('No se pudo enviar el reporte. Verifica tu conexión e intenta de nuevo.');
            return false;
        });
        return () => {
            offException();
            offNetwork();
        };
    }, []);

    const form = useForm({
        incident_type_id: '' as string | number,
        description: '',
        latitude: '' as string | number,
        longitude: '' as string | number,
        address_text: '',
        media: [] as File[],
    });

    // Citizens can attach several photos/videos, in any order. The AI (classification
    // assist + duplicate detection) always looks at the FIRST photo ever added to the
    // list — never a video, and never a later photo — regardless of what's added after it.
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const firstPhoto = mediaItems.find((m) => m.kind === 'image')?.file ?? null;
    const hasPhoto = firstPhoto !== null;

    useEffect(() => {
        form.setData('media', mediaItems.map((m) => m.file));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaItems]);

    // AI classification assist: triggers off the first photo alone (description is
    // optional and only refines the result if present). Auto-fills "Tipo de incidente"
    // when confident, but never fights a manual choice — see the effect below. Any
    // Gemini failure or low confidence must be invisible to the citizen: the combo just
    // stays empty/manual, exactly like before this feature existed.
    const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
    const [aiAppliedTypeId, setAiAppliedTypeId] = useState<number | null>(null);
    const aiAppliedTypeIdRef = useRef<number | null>(null);
    const incidentTypeIdRef = useRef(form.data.incident_type_id);

    useEffect(() => {
        incidentTypeIdRef.current = form.data.incident_type_id;
    }, [form.data.incident_type_id]);

    useEffect(() => {
        if (!firstPhoto) {
            setAiSuggestion(null);
            aiAppliedTypeIdRef.current = null;
            setAiAppliedTypeId(null);
            return;
        }

        const description = form.data.description.trim();
        const controller = new AbortController();

        const timer = setTimeout(() => {
            const payload = new FormData();
            payload.append('description', description);
            payload.append('photo', firstPhoto);

            axios
                .post<AiSuggestion>('/reportes/asistente-ia', payload, { signal: controller.signal })
                .then((res) => {
                    setAiSuggestion(res.data);

                    const confident = res.data.confidence === 'alta' || res.data.confidence === 'media';
                    const suggestedId = res.data.suggested_incident_type_id;

                    if (confident && suggestedId != null) {
                        // Only auto-apply if the field is still empty or still holds our
                        // own earlier suggestion — never override a manual citizen choice.
                        const current = incidentTypeIdRef.current;
                        if (current === '' || current === aiAppliedTypeIdRef.current) {
                            aiAppliedTypeIdRef.current = suggestedId;
                            setAiAppliedTypeId(suggestedId);
                            form.setData('incident_type_id', suggestedId);
                        }
                    }
                })
                .catch(() => {
                    // Silent by design: the assistant is optional, the form must keep working as before.
                });
        }, 900);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.description, firstPhoto]);

    const showAiClassifiedNote =
        aiAppliedTypeId != null && String(form.data.incident_type_id) === String(aiAppliedTypeId);

    const showPhotoWarning = aiSuggestion?.photo_matches_category === false && !!aiSuggestion.warning_message;

    // Duplicate detection: checked once, right before the final submit. Best-effort —
    // any failure or empty result must let the form submit exactly as it does today.
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[] | null>(null);
    const [confirmingDuplicateId, setConfirmingDuplicateId] = useState<number | null>(null);
    const [duplicateModalError, setDuplicateModalError] = useState<string | null>(null);

    function submitReport() {
        form.post('/reports', {
            forceFormData: true,
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
            onError: (errors) => {
                if (Object.keys(errors).length === 0) {
                    setSubmitError('No se pudo registrar el incidente. Intenta de nuevo.');
                }
            },
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitError(null);

        const description = form.data.description.trim();

        if (!description || !form.data.incident_type_id || !coords) {
            submitReport();
            return;
        }

        setCheckingDuplicates(true);

        try {
            const payload = new FormData();
            payload.append('description', description);
            payload.append('incident_type_id', String(form.data.incident_type_id));
            payload.append('latitude', String(form.data.latitude));
            payload.append('longitude', String(form.data.longitude));
            if (firstPhoto) {
                payload.append('photo', firstPhoto);
            }

            const res = await axios.post<{ duplicates: DuplicateCandidate[] }>(
                '/reportes/verificar-duplicados',
                payload,
            );
            const duplicates = res.data.duplicates ?? [];

            if (duplicates.length > 0) {
                setDuplicateCandidates(duplicates);
                setCheckingDuplicates(false);
                return;
            }
        } catch {
            // Silent by design: duplicate detection is optional and must never block submission.
        }

        setCheckingDuplicates(false);
        submitReport();
    }

    function continueDespiteDuplicate() {
        const top = duplicateCandidates?.[0];
        setDuplicateCandidates(null);
        setDuplicateModalError(null);

        if (top) {
            form.transform((data) => ({
                ...data,
                possible_duplicate_of: top.report_id,
                duplicate_similarity: top.similarity,
            }));
        }

        submitReport();
    }

    async function confirmSameProblem(reportId: number) {
        setConfirmingDuplicateId(reportId);
        setDuplicateModalError(null);

        try {
            await axios.post(`/reports/${reportId}/confirmar-duplicado`);
            setDuplicateCandidates(null);
            onSuccess?.();
            onClose();
        } catch {
            setDuplicateModalError('No se pudo registrar tu confirmación. Intenta de nuevo.');
        } finally {
            setConfirmingDuplicateId(null);
        }
    }

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

    async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (fileRef.current) fileRef.current.value = '';
        if (files.length === 0) return;

        const newItems: MediaItem[] = [];

        for (const file of files) {
            if (file.type.startsWith('video/')) {
                newItems.push({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    file,
                    kind: 'video',
                    previewUrl: URL.createObjectURL(file),
                });
                continue;
            }

            setCompressing(true);
            const compressed = await compressImage(file);
            newItems.push({
                id: crypto.randomUUID(),
                file: compressed,
                kind: 'image',
                previewUrl: URL.createObjectURL(compressed),
            });
        }

        setCompressing(false);
        setMediaItems((prev) => [...prev, ...newItems]);
    }

    function removeMediaItem(id: string) {
        setMediaItems((prev) => prev.filter((m) => m.id !== id));
    }

    const hasCoords = coords !== null;

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
                <div>
                    <h2 className="text-base font-semibold text-[#1F2937]">Registrar incidente</h2>
                    <p className="text-xs text-gray-500">
                        {hasCoords
                            ? 'Ubicación seleccionada en el mapa'
                            : 'Haz clic en el mapa para seleccionar la ubicación'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                {/* Incident type */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#1F2937]" htmlFor="incident_type_id">
                        Tipo de incidente *
                    </label>
                    <select
                        id="incident_type_id"
                        value={form.data.incident_type_id}
                        onChange={(e) => form.setData('incident_type_id', e.target.value)}
                        disabled={!hasPhoto}
                        className={cn(
                            'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                            'bg-white text-[#1F2937]',
                            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
                            form.errors.incident_type_id
                                ? 'border-red-400'
                                : 'border-[#E5E7EB]',
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
                    {!hasPhoto && (
                        <p className="text-[11px] text-gray-500">Sube una foto para clasificar automáticamente.</p>
                    )}
                    {showAiClassifiedNote && (
                        <p className="flex items-center gap-1 text-[11px] text-brand-600">
                            <Sparkles className="h-3 w-3" />
                            Clasificado automáticamente por IA a partir de la foto — puedes cambiarlo si no es correcto.
                        </p>
                    )}
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#1F2937]" htmlFor="description">
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
                            'bg-white text-[#1F2937] placeholder:text-[#9CA3AF]',
                            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            form.errors.description ? 'border-red-400' : 'border-[#E5E7EB]',
                        )}
                    />
                    <div className="flex items-center justify-between">
                        {form.errors.description ? (
                            <p className="text-xs text-red-500">{form.errors.description}</p>
                        ) : (
                            <span />
                        )}
                        <span className="text-[10px] text-gray-600">{form.data.description.length}/800</span>
                    </div>
                </div>

                {/* Address text */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#1F2937]" htmlFor="address_text">
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
                            'bg-white text-[#1F2937] placeholder:text-[#9CA3AF]',
                            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            form.errors.address_text ? 'border-red-400' : 'border-[#E5E7EB]',
                        )}
                    />
                    {form.errors.address_text && (
                        <p className="text-xs text-red-500">{form.errors.address_text}</p>
                    )}
                </div>

                {/* Photo/video capture */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#1F2937]">Fotos o videos</label>

                    {mediaItems.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {mediaItems.map((item) => (
                                <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg">
                                    {item.kind === 'video' ? (
                                        <video src={item.previewUrl} className="h-full w-full bg-black object-cover" />
                                    ) : (
                                        <img src={item.previewUrl} alt="Preview" className="h-full w-full object-cover" />
                                    )}
                                    {item.file === firstPhoto && (
                                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                                            Foto principal
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeMediaItem(item.id)}
                                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {compressing && (
                        <div className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#E5E7EB] py-4 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-xs">Optimizando imagen…</span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className={cn(
                            'flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed py-6',
                            'text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-600',
                            form.errors.media ? 'border-red-400' : 'border-[#E5E7EB]',
                        )}
                    >
                        <Camera className="h-5 w-5" />
                        <span className="text-xs">
                            {mediaItems.length > 0
                                ? 'Agregar otra foto o video'
                                : 'Tomar foto o video, o elegir de la galería'}
                        </span>
                        <span className="text-[10px]">JPG, PNG, WEBP, MP4, MOV, WEBM · máx 50 MB c/u</span>
                    </button>

                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={handleMediaChange}
                    />
                    {form.errors.media && (
                        <p className="text-xs text-red-500">{form.errors.media}</p>
                    )}
                    {mediaItems.length > 1 && (
                        <p className="text-[11px] text-gray-500">
                            La IA solo revisa la primera foto para clasificar y buscar duplicados.
                        </p>
                    )}
                </div>

                {/* AI photo/category mismatch warning (soft, non-blocking) */}
                {showPhotoWarning && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {aiSuggestion?.warning_message}
                    </div>
                )}

                {/* Submit error */}
                {submitError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {submitError}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={form.processing || compressing || checkingDuplicates || !hasCoords}
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
                    ) : checkingDuplicates ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verificando…
                        </>
                    ) : (
                        <>
                            <ImageIcon className="h-4 w-4" />
                            Registrar incidente
                        </>
                    )}
                </button>
            </form>

            {/* Possible-duplicate modal */}
            {duplicateCandidates && duplicateCandidates.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                    >
                        <div className="border-b border-[#E5E7EB] px-5 py-4">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
                                <Copy className="h-4 w-4 text-brand-600" />
                                Encontramos reportes parecidos cerca
                            </h3>
                            <p className="mt-1 text-xs text-gray-500">
                                Puede que este problema ya haya sido reportado. Revisa antes de continuar.
                            </p>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto p-5">
                            {duplicateCandidates.map((dup) => (
                                <div key={dup.report_id} className="flex gap-3 rounded-lg border border-[#E5E7EB] p-3">
                                    {dup.photo_path && (
                                        <img
                                            src={getStorageUrl(dup.photo_path)}
                                            alt="Reporte similar"
                                            className="h-16 w-16 shrink-0 rounded-md object-cover"
                                        />
                                    )}
                                    <div className="flex flex-1 flex-col gap-1 text-xs">
                                        <p className="line-clamp-2 text-[#1F2937]">{dup.description}</p>
                                        <span className="flex items-center gap-1 text-gray-500">
                                            <MapPin className="h-3 w-3" />
                                            {dup.address_text} · a {Math.round(dup.distance_meters)} m
                                        </span>
                                        <span className="text-brand-600">
                                            {Math.round(dup.similarity * 100)}% de similitud
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => confirmSameProblem(dup.report_id)}
                                            disabled={confirmingDuplicateId !== null}
                                            className="mt-1 flex w-fit items-center gap-1.5 rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {confirmingDuplicateId === dup.report_id && (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            )}
                                            Es el mismo problema
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {duplicateModalError && (
                                <p className="text-xs text-red-500">{duplicateModalError}</p>
                            )}
                        </div>

                        <div className="border-t border-[#E5E7EB] px-5 py-4">
                            <button
                                type="button"
                                onClick={continueDespiteDuplicate}
                                disabled={confirmingDuplicateId !== null}
                                className="w-full rounded-lg border border-[#E5E7EB] py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                No es igual, continuar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

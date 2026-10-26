import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, Tag, ExternalLink, Play } from 'lucide-react';
import { formatDateTime, getStorageUrl, cn, STATUS_LABELS } from '@/lib/utils';
import { getIncidentTypeStyle } from '@/lib/incidentTypeStyle';
import StatusBadge from './StatusBadge';
import MediaLightbox from './MediaLightbox';
import type { Report, ReportImage, ReportStatus } from '@/types';

interface ReportPreviewCardProps {
    report: Report | null;
    onClose: () => void;
    onViewDetails: (reportId: number) => void;
    className?: string;
    /** Entity/operator views read "notificado" as confusing ("notified to whom?") — let callers swap the base label set. */
    statusLabels?: Record<ReportStatus, string>;
}

export default function ReportPreviewCard({ report, onClose, onViewDetails, className, statusLabels = STATUS_LABELS }: ReportPreviewCardProps) {
    const [lightbox, setLightbox] = useState<ReportImage | null>(null);

    // Reset the lightbox whenever a different report is previewed
    useEffect(() => {
        setLightbox(null);
    }, [report?.id]);

    return (
        <>
        <AnimatePresence>
            {report && (
                <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={cn(
                        'max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/90 text-white shadow-[var(--shadow-modal)] backdrop-blur-md',
                        className,
                    )}
                >
                    {(() => {
                        const { color, Icon } = getIncidentTypeStyle(report.incident_type);
                        const code = `REP-${new Date(report.created_at).getFullYear()}-${String(report.id).padStart(6, '0')}`;
                        const image = report.images?.[0];
                        const extraImages = Math.max(0, (report.images?.length ?? 0) - 2);

                        return (
                            <>
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                                            style={{ backgroundColor: `${color}22`, color }}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                {report.incident_type?.name ?? 'Reporte'}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <StatusBadge status={report.status} labelOverride={statusLabels[report.status]} />
                                                <span className="text-[11px] text-white/50">{code}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                        aria-label="Cerrar"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Meta rows */}
                                <div className="space-y-2.5 p-4 text-xs">
                                    {report.address_text && (
                                        <div className="flex items-start gap-2 text-white/70">
                                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                                            <span>{report.address_text}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-white/70">
                                        <Calendar className="h-3.5 w-3.5 shrink-0 text-white/40" />
                                        <span>{formatDateTime(report.created_at)}</span>
                                    </div>
                                    {report.incident_type && (
                                        <div className="flex items-center gap-2 text-white/70">
                                            <Tag className="h-3.5 w-3.5 shrink-0 text-white/40" />
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                                                {report.incident_type.name}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="px-4 pb-3 text-xs leading-relaxed text-white/70">
                                    {report.description}
                                </p>

                                {/* Photos / videos */}
                                {report.images && report.images.length > 0 && (
                                    <div className="grid grid-cols-3 gap-1.5 px-4 pb-4">
                                        {report.images.slice(0, 2).map((img) => (
                                            <button
                                                key={img.id}
                                                type="button"
                                                onClick={() => setLightbox(img)}
                                                className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg"
                                            >
                                                {img.type === 'video' ? (
                                                    <>
                                                        <video src={getStorageUrl(img.path)} className="h-full w-full object-cover" preload="metadata" muted />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <Play className="h-4 w-4 fill-white text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <img src={getStorageUrl(img.path)} alt="Foto del reporte" className="h-full w-full object-cover" />
                                                )}
                                            </button>
                                        ))}
                                        {extraImages > 0 && image && (
                                            <button
                                                type="button"
                                                onClick={() => setLightbox(report.images![2] ?? image)}
                                                className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg"
                                            >
                                                {image.type === 'video' ? (
                                                    <video src={getStorageUrl(report.images[2]?.path ?? image.path)} className="h-full w-full object-cover" preload="metadata" muted />
                                                ) : (
                                                    <img
                                                        src={getStorageUrl(report.images[2]?.path ?? image.path)}
                                                        alt="Más fotos"
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
                                                    +{extraImages}
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="px-4 pb-4">
                                    <button
                                        onClick={() => onViewDetails(report.id)}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Ver detalles del reporte
                                    </button>
                                </div>
                            </>
                        );
                    })()}
                </motion.div>
            )}
        </AnimatePresence>

        <MediaLightbox media={lightbox} onClose={() => setLightbox(null)} />
        </>
    );
}

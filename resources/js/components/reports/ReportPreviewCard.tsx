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
                        'max-h-[75vh] w-84 overflow-y-auto rounded-3xl border border-white/15 bg-slate-900/95 text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl ring-1 ring-white/10',
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
                                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4.5 bg-slate-950/40">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 shadow-sm"
                                            style={{ backgroundColor: `${color}25`, color }}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white tracking-tight">
                                                {report.incident_type?.name ?? 'Reporte'}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <StatusBadge status={report.status} labelOverride={statusLabels[report.status]} />
                                                <span className="text-[11px] font-medium text-slate-400">{code}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                                        aria-label="Cerrar"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Meta rows */}
                                <div className="space-y-2.5 p-4.5 text-xs">
                                    {report.address_text && (
                                        <div className="flex items-start gap-2 text-slate-300">
                                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            <span className="font-medium">{report.address_text}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                        <span>{formatDateTime(report.created_at)}</span>
                                    </div>
                                    {report.incident_type && (
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            <span className="inline-flex items-center gap-1.5 font-medium">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                                {report.incident_type.name}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="px-4.5 pb-3.5 text-xs leading-relaxed text-slate-200">
                                    {report.description}
                                </p>

                                {/* Photos / videos */}
                                {report.images && report.images.length > 0 && (
                                    <div className="grid grid-cols-3 gap-1.5 px-4.5 pb-4.5">
                                        {report.images.slice(0, 2).map((img) => (
                                            <button
                                                key={img.id}
                                                type="button"
                                                onClick={() => setLightbox(img)}
                                                className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl border border-white/10"
                                            >
                                                {img.type === 'video' ? (
                                                    <>
                                                        <video src={getStorageUrl(img.path)} className="h-full w-full object-cover" preload="metadata" muted />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
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
                                                className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl border border-white/10"
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
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-bold text-white">
                                                    +{extraImages}
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="px-4.5 pb-4.5">
                                    <button
                                        onClick={() => onViewDetails(report.id)}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:from-brand-500 hover:to-brand-600 hover:shadow-[0_0_30px_rgba(37,99,235,0.65)]"
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

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageSquare, MapPin, Pencil, Play } from 'lucide-react';
import axios from 'axios';
import { cn, formatDistanceKm, formatRelativeTime, getStorageUrl, truncate } from '@/lib/utils';
import { getIncidentTypeStyle } from '@/lib/incidentTypeStyle';
import StatusBadge from './StatusBadge';
import type { Report, PageProps } from '@/types';
import { usePage } from '@inertiajs/react';

interface ReportCardProps {
    report: Report;
    onReportClick?: (report: Report) => void;
    distanceKm?: number;
}

export default function ReportCard({ report, onReportClick, distanceKm }: ReportCardProps) {
    const { auth } = usePage<PageProps>().props;
    const [liked, setLiked] = useState(report.user_liked ?? false);
    const [likesCount, setLikesCount] = useState(report.likes_count ?? 0);
    const [liking, setLiking] = useState(false);

    const image = report.images?.[0];

    async function toggleLike(e: React.MouseEvent) {
        e.stopPropagation();
        if (liking) return;
        setLiking(true);
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount(c => wasLiked ? c - 1 : c + 1);
        try {
            await axios.post(`/reports/${report.id}/like`);
        } catch {
            setLiked(wasLiked);
            setLikesCount(c => wasLiked ? c + 1 : c - 1);
        } finally {
            setLiking(false);
        }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            onClick={() => onReportClick?.(report)}
            className={cn(
                'group flex flex-col rounded-xl border border-default bg-surface-primary',
                'shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]',
                onReportClick && 'cursor-pointer',
            )}
        >
            {/* Image */}
            <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-surface-tertiary">
                {image ? (
                    image.type === 'video' ? (
                        <div className="relative h-full w-full">
                            <video
                                src={getStorageUrl(image.path)}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                preload="metadata"
                                muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white">
                                    <Play className="h-4 w-4 fill-current" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <img
                            src={getStorageUrl(image.path)}
                            alt="Foto del reporte"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        />
                    )
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <MapPin className="h-8 w-8 text-muted opacity-30" />
                    </div>
                )}

                {/* Status badge overlay */}
                <div className="absolute left-3 top-3">
                    <StatusBadge status={report.status} />
                </div>

                {/* Incident type chip */}
                {report.incident_type && (() => {
                    const { color, Icon } = getIncidentTypeStyle(report.incident_type);
                    return (
                        <div className="absolute right-3 top-3">
                            <span
                                style={{ backgroundColor: color }}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow-sm"
                            >
                                <Icon className="h-3 w-3" />
                                {report.incident_type.name}
                            </span>
                        </div>
                    );
                })()}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-2 p-4">
                {/* Description */}
                <p className="text-sm text-secondary leading-relaxed">
                    {truncate(report.description, 120)}
                </p>

                {/* Address */}
                {report.address_text && (
                    <p className="flex items-center gap-1 text-xs text-muted">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {truncate(report.address_text, 60)}
                        {distanceKm !== undefined && (
                            <span className="ml-1 shrink-0 text-brand-500">
                                · {formatDistanceKm(distanceKm)}
                            </span>
                        )}
                    </p>
                )}

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between pt-2 border-t border-default">
                    {/* User + time */}
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                            {report.user?.name?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <span className="text-xs text-muted">
                            {report.user?.name ?? 'Usuario'} · {formatRelativeTime(report.created_at)}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleLike}
                            disabled={!auth.user}
                            className={cn(
                                'flex items-center gap-1 text-xs transition-colors',
                                liked
                                    ? 'text-red-500'
                                    : 'text-muted hover:text-red-400',
                                !auth.user && 'cursor-default',
                            )}
                            aria-label="Me gusta"
                        >
                            <Heart
                                className={cn('h-3.5 w-3.5', liked && 'fill-current')}
                            />
                            {likesCount > 0 && <span>{likesCount}</span>}
                        </button>

                        <span className="flex items-center gap-1 text-xs text-muted">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {report.comments_count ?? 0}
                        </span>

                        {report.is_edited && (
                            <span title="Editado" className="text-muted">
                                <Pencil className="h-3 w-3" />
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

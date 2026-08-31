import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
    /** CSS selector for the element to spotlight. Omit to show a centered, un-anchored step. */
    selector?: string;
    title: string;
    description: string;
}

interface GuidedTourProps {
    steps: TourStep[];
    open: boolean;
    onClose: () => void;
}

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const PADDING = 8;

export default function GuidedTour({ steps, open, onClose }: GuidedTourProps) {
    const [index, setIndex] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);

    const measure = useCallback(() => {
        const step = steps[index];
        if (!step?.selector) {
            setRect(null);
            return;
        }
        const el = document.querySelector(step.selector);
        if (!el) {
            setRect(null);
            return;
        }
        const r = el.getBoundingClientRect();
        setRect({ top: r.top - PADDING, left: r.left - PADDING, width: r.width + PADDING * 2, height: r.height + PADDING * 2 });
    }, [index, steps]);

    useEffect(() => {
        if (!open) return;
        setIndex(0);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        const raf = requestAnimationFrame(measure);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
            cancelAnimationFrame(raf);
        };
    }, [open, measure]);

    if (!open) return null;

    const step = steps[index];
    const isLast = index === steps.length - 1;

    // Prefer placing the tooltip below the target; flip above if there isn't room. For very
    // large targets (e.g. the whole map) neither edge is meaningful, so just clamp into view.
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 900;
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1400;
    const tooltipWidth = 320;
    const tooltipHeightEstimate = 190;
    const margin = 16;

    let top: number;
    if (!rect) {
        top = viewportH / 2 - tooltipHeightEstimate / 2;
    } else {
        const spaceBelow = viewportH - (rect.top + rect.height);
        const placeAbove = spaceBelow < tooltipHeightEstimate + 24 && rect.top > tooltipHeightEstimate + 24;
        top = placeAbove
            ? Math.max(margin, rect.top - 12 - tooltipHeightEstimate)
            : Math.min(rect.top + rect.height + 12, viewportH - tooltipHeightEstimate - margin);
        top = Math.max(margin, top);
    }

    const left = rect
        ? Math.min(Math.max(margin, rect.left + rect.width / 2 - tooltipWidth / 2), viewportW - tooltipWidth - margin)
        : viewportW / 2 - tooltipWidth / 2;

    const tooltipStyle: React.CSSProperties = { top, left };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[3000]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Spotlight cutout (or full dim backdrop if nothing to highlight) */}
                    {rect ? (
                        <motion.div
                            animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="absolute rounded-xl"
                            style={{ boxShadow: '0 0 0 9999px rgba(8,11,20,0.72)' }}
                        />
                    ) : (
                        <div className="absolute inset-0 bg-slate-950/72" />
                    )}

                    {/* Tooltip */}
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="absolute w-80 rounded-2xl border border-white/10 bg-slate-900 p-4 text-white shadow-[var(--shadow-modal)]"
                        style={tooltipStyle}
                    >
                        <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold">{step.title}</h3>
                            <button
                                onClick={onClose}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                aria-label="Cerrar tour"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <p className="text-xs leading-relaxed text-white/70">{step.description}</p>

                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                {steps.map((_, i) => (
                                    <span
                                        key={i}
                                        className={cn(
                                            'h-1.5 rounded-full transition-all',
                                            i === index ? 'w-4 bg-brand-400' : 'w-1.5 bg-white/20',
                                        )}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                {index > 0 && (
                                    <button
                                        onClick={() => setIndex((i) => Math.max(0, i - 1))}
                                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5" />
                                        Anterior
                                    </button>
                                )}
                                <button
                                    onClick={() => (isLast ? onClose() : setIndex((i) => i + 1))}
                                    className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                                >
                                    {isLast ? (
                                        <>
                                            Entendido
                                            <Check className="h-3.5 w-3.5" />
                                        </>
                                    ) : (
                                        <>
                                            Siguiente
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

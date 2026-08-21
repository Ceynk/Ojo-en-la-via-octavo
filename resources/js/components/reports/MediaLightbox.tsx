import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { getStorageUrl } from '@/lib/utils';
import type { ReportImage } from '@/types';

interface MediaLightboxProps {
    media: ReportImage | null;
    onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

/** Full-screen photo/video viewer — zoomable, draggable, downloadable. Portaled to <body>
 * so it truly covers the viewport regardless of any ancestor's z-index/transform/overflow. */
export default function MediaLightbox({ media, onClose }: MediaLightboxProps) {
    const [zoom, setZoom] = useState(MIN_ZOOM);
    const [dragging, setDragging] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

    // Reset zoom every time a different photo/video is opened
    useEffect(() => {
        setZoom(MIN_ZOOM);
    }, [media?.id]);

    useEffect(() => {
        if (!media) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [media, onClose]);

    function handleWheelZoom(e: React.WheelEvent) {
        // Pinch-to-zoom on a trackpad (or Ctrl+wheel on a mouse) zooms; a plain scroll/swipe
        // pans the image normally, so the wheel isn't hijacked for zoom by default.
        if (!e.ctrlKey) return;
        e.preventDefault();
        setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - Math.sign(e.deltaY) * 0.25)));
    }

    function handlePointerDown(e: React.PointerEvent) {
        if (zoom <= MIN_ZOOM || !scrollRef.current) return;
        setDragging(true);
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            scrollLeft: scrollRef.current.scrollLeft,
            scrollTop: scrollRef.current.scrollTop,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: React.PointerEvent) {
        if (!dragging || !scrollRef.current) return;
        scrollRef.current.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x);
        scrollRef.current.scrollTop = dragStart.current.scrollTop - (e.clientY - dragStart.current.y);
    }

    function handlePointerUp() {
        setDragging(false);
    }

    return createPortal(
        <AnimatePresence>
            {media && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[2000] flex items-center justify-center p-6"
                    style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
                >
                    {/* Top-right actions */}
                    <div className="absolute right-4 top-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <a
                            href={getStorageUrl(media.path)}
                            download
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                            aria-label="Descargar"
                            title="Descargar"
                        >
                            <Download className="h-4 w-4" />
                        </a>
                        <button
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                            aria-label="Cerrar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {media.type === 'video' ? (
                        <video
                            src={getStorageUrl(media.path)}
                            controls
                            autoPlay
                            onClick={(e) => e.stopPropagation()}
                            className="max-h-full max-w-full rounded-lg"
                        />
                    ) : (
                        <>
                            <div
                                ref={scrollRef}
                                onClick={(e) => e.stopPropagation()}
                                onWheel={handleWheelZoom}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                                className="max-h-full max-w-full overflow-auto rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                style={{
                                    maxHeight: '85vh',
                                    maxWidth: '90vw',
                                    cursor: zoom > MIN_ZOOM ? (dragging ? 'grabbing' : 'grab') : 'default',
                                }}
                            >
                                <img
                                    src={getStorageUrl(media.path)}
                                    alt="Foto del reporte"
                                    draggable={false}
                                    className="block select-none rounded-lg transition-[width] duration-150"
                                    style={{ width: `${zoom * 100}%`, maxWidth: 'none' }}
                                />
                            </div>

                            {/* Zoom controls */}
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur-md"
                            >
                                <button
                                    onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
                                    disabled={zoom <= MIN_ZOOM}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 disabled:opacity-30"
                                    aria-label="Alejar"
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </button>
                                <span className="w-12 text-center text-xs font-medium text-white">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
                                    disabled={zoom >= MAX_ZOOM}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 disabled:opacity-30"
                                    aria-label="Acercar"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}

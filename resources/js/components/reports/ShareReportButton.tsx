import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Link2, Check } from 'lucide-react';
import type { Report } from '@/types';

interface ShareReportButtonProps {
    report: Pick<Report, 'id' | 'description' | 'address_text' | 'incident_type'>;
    /** Small icon sized for card footers; the menu opens upwards so the next card can't cover it. */
    compact?: boolean;
}

/** Deep link that opens this report's detail on the map (see Home.tsx `?reporte=`). */
export function reportShareUrl(id: number): string {
    return `${window.location.origin}/inicio?reporte=${id}`;
}

/**
 * RF-13 — share a report. On phones it opens the native share sheet (WhatsApp, Facebook,
 * Instagram… whatever the person has installed); elsewhere it falls back to a small menu
 * with the main networks plus "copy link". Someone opening the link without a session is
 * sent to log in first and then lands on the report.
 */
export default function ShareReportButton({ report, compact = false }: ShareReportButtonProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const url = reportShareUrl(report.id);
    const type = report.incident_type?.name ?? 'Incidente vial';
    const text = `${type} reportado en ${report.address_text}: "${report.description.slice(0, 120)}${report.description.length > 120 ? '…' : ''}" — Apóyalo en Ojo en la Vía`;

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    async function handleClick() {
        if (navigator.share) {
            try {
                await navigator.share({ title: `${type} — Ojo en la Vía`, text, url });
                return;
            } catch (e) {
                // AbortError = the person closed the sheet; anything else → show our menu.
                if ((e as DOMException)?.name === 'AbortError') return;
            }
        }
        setOpen((o) => !o);
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            window.prompt('Copia este enlace:', url);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    const networks = [
        { name: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, color: 'text-emerald-400' },
        { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: 'text-blue-400' },
        { name: 'X (Twitter)', href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, color: 'text-slate-200' },
        { name: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, color: 'text-sky-400' },
    ];

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={handleClick}
                className={
                    compact
                        ? 'flex items-center gap-1 text-xs text-muted transition-colors hover:text-primary'
                        : 'flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary'
                }
                aria-label="Compartir reporte"
                title="Compartir"
            >
                <Share2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: compact ? 6 : -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: compact ? 6 : -6 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 ${compact ? 'bottom-7' : 'top-10'} z-10 w-48 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 py-1 shadow-[var(--shadow-elevated)] backdrop-blur-md`}
                    >
                        {networks.map((n) => (
                            <a
                                key={n.name}
                                href={n.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setOpen(false)}
                                className={`block px-4 py-2 text-sm transition-colors hover:bg-white/5 ${n.color}`}
                            >
                                {n.name}
                            </a>
                        ))}
                        <button
                            type="button"
                            onClick={copyLink}
                            className="flex w-full items-center gap-2 border-t border-white/10 px-4 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-white/5"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5" />}
                            {copied ? 'Enlace copiado' : 'Copiar enlace'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

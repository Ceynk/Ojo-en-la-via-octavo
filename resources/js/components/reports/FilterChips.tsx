import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIncidentTypeStyle } from '@/lib/incidentTypeStyle';
import type { IncidentType, ReportStatus } from '@/types';

const STATUS_CHIPS: { value: ReportStatus; label: string }[] = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_revision', label: 'En revisión' },
    { value: 'notificado', label: 'Notificado' },
    { value: 'resuelto', label: 'Resuelto' },
];

interface FilterChipsProps {
    status: ReportStatus | '';
    incidentTypeId: number | '';
    incidentTypes: IncidentType[];
    onToggleStatus: (value: ReportStatus) => void;
    onSelectType: (value: number | '') => void;
    className?: string;
}

const chipClass = (active: boolean) =>
    cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
            ? 'border-brand-600 bg-brand-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.35)]'
            : 'border-default bg-surface-tertiary text-secondary hover:bg-white/15 hover:text-primary',
    );

export default function FilterChips({
    status,
    incidentTypeId,
    incidentTypes,
    onToggleStatus,
    onSelectType,
    className,
}: FilterChipsProps) {
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // The chip row scrolls horizontally (overflow-x-auto), which forces the browser to also
    // clip vertical overflow — an absolutely-positioned dropdown here would get cut off.
    // Portal it to <body> instead, positioned from the trigger button's real coordinates.
    useEffect(() => {
        if (!categoryOpen) return;

        function updatePosition() {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (rect) setMenuPos({ top: rect.bottom + 8, left: rect.left });
        }
        updatePosition();

        function handlePointerDown(e: PointerEvent) {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
                menuRef.current && !menuRef.current.contains(e.target as Node)
            ) {
                setCategoryOpen(false);
            }
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setCategoryOpen(false);
        }

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKey);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKey);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [categoryOpen]);

    const selectedType = incidentTypes.find((t) => t.id === incidentTypeId);

    return (
        <div
            className={cn(
                'flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                className,
            )}
        >
            {STATUS_CHIPS.map((chip) => (
                <button
                    key={chip.value}
                    onClick={() => onToggleStatus(chip.value)}
                    className={chipClass(status === chip.value)}
                >
                    {chip.label}
                </button>
            ))}

            <span className="my-1 w-px shrink-0 bg-white/15" />

            {/* Category dropdown — one field instead of a chip per category */}
            <button
                ref={triggerRef}
                onClick={() => setCategoryOpen((o) => !o)}
                className={cn(chipClass(!!selectedType), 'shrink-0')}
            >
                {selectedType ? (
                    <>
                        {(() => {
                            const { Icon } = getIncidentTypeStyle(selectedType);
                            return <Icon className="mr-1 -mt-px inline h-3.5 w-3.5" />;
                        })()}
                        {selectedType.name}
                    </>
                ) : (
                    'Todas las categorías'
                )}
                <ChevronDown className={cn('ml-1 -mt-px inline h-3 w-3 opacity-60 transition-transform', categoryOpen && 'rotate-180')} />
            </button>

            {categoryOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[1000] max-h-72 w-60 overflow-y-auto rounded-xl border border-default bg-slate-900/95 p-1.5 shadow-[var(--shadow-elevated)] backdrop-blur-md"
                    style={{ top: menuPos.top, left: menuPos.left }}
                >
                    <button
                        onClick={() => { onSelectType(''); setCategoryOpen(false); }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        Todas las categorías
                        {incidentTypeId === '' && <Check className="h-3.5 w-3.5 text-brand-400" />}
                    </button>
                    {incidentTypes.map((type) => {
                        const { color, Icon } = getIncidentTypeStyle(type);
                        const active = incidentTypeId === type.id;
                        return (
                            <button
                                key={type.id}
                                onClick={() => { onSelectType(type.id); setCategoryOpen(false); }}
                                className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <span className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" style={{ color }} />
                                    {type.name}
                                </span>
                                {active && <Check className="h-3.5 w-3.5 text-brand-400" />}
                            </button>
                        );
                    })}
                </div>,
                document.body,
            )}
        </div>
    );
}

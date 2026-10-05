import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon: React.ElementType;
    error?: string;
    hint?: string;
    rightElement?: React.ReactNode;
}

const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
    ({ label, icon: Icon, error, hint, rightElement, className, id, ...props }, ref) => {
        const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="flex flex-col gap-1.5">
                <label htmlFor={inputId} className="text-sm font-medium text-slate-200">
                    {label}
                </label>
                <div className="relative">
                    <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        id={inputId}
                        ref={ref}
                        className={cn(
                            'h-11 w-full rounded-xl border border-white/15 bg-slate-950/40 pl-10.5 text-sm text-white placeholder:text-slate-400 transition-all',
                            'focus:border-brand-500/80 focus:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                            rightElement ? 'pr-10' : 'pr-3',
                            error ? 'border-red-500/60 ring-2 ring-red-500/20' : 'hover:border-white/25',
                            className,
                        )}
                        {...props}
                    />
                    {rightElement}
                </div>
                {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
                {error && <p className="text-xs font-medium text-red-400">{error}</p>}
            </div>
        );
    },
);
GlassInput.displayName = 'GlassInput';

export { GlassInput };

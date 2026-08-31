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
                <label htmlFor={inputId} className="text-sm font-medium text-white/90">
                    {label}
                </label>
                <div className="relative">
                    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input
                        id={inputId}
                        ref={ref}
                        className={cn(
                            'h-11 w-full rounded-lg border border-white/15 bg-black/20 pl-10 text-sm text-white placeholder:text-white/40 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400',
                            rightElement ? 'pr-10' : 'pr-3',
                            error && 'ring-2 ring-red-400/60',
                            className,
                        )}
                        {...props}
                    />
                    {rightElement}
                </div>
                {hint && !error && <p className="text-xs text-white/50">{hint}</p>}
                {error && <p className="text-xs text-red-300">{error}</p>}
            </div>
        );
    },
);
GlassInput.displayName = 'GlassInput';

export { GlassInput };

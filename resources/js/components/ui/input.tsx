import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
    hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, label, hint, id, ...props }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-sm font-medium text-primary"
                    >
                        {label}
                    </label>
                )}
                <input
                    type={type}
                    id={inputId}
                    className={cn(
                        'flex h-11 w-full rounded-[var(--radius-button)] border border-default bg-slate-950/30 px-3 py-2 text-sm text-primary placeholder:text-muted',
                        'transition-colors duration-150',
                        'focus:outline-none focus:border-brand-400/70 focus:ring-2 focus:ring-brand-500/20',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-red-400 focus:ring-red-400',
                        className,
                    )}
                    ref={ref}
                    {...props}
                />
                {hint && !error && (
                    <p className="text-xs text-muted">{hint}</p>
                )}
                {error && (
                    <p className="text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    },
);
Input.displayName = 'Input';

export { Input };

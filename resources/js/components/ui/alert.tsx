import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'success' | 'error' | 'info';

interface AlertProps {
    variant: AlertVariant;
    message: string;
    onDismiss?: () => void;
    className?: string;
}

const config: Record<AlertVariant, { icon: React.ElementType; classes: string }> = {
    success: {
        icon: CheckCircle,
        classes: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300',
    },
    error: {
        icon: XCircle,
        classes: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300',
    },
    info: {
        icon: Info,
        classes: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300',
    },
};

export function Alert({ variant, message, onDismiss, className }: AlertProps) {
    const { icon: Icon, classes } = config[variant];

    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'flex items-start gap-3 rounded-lg border p-4 text-sm',
                classes,
                className,
            )}
            role="alert"
        >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1">{message}</span>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </motion.div>
    );
}

interface FlashMessagesProps {
    success?: string;
    error?: string;
    info?: string;
    className?: string;
}

export function FlashMessages({ success, error, info, className }: FlashMessagesProps) {
    const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());

    const messages: { key: string; variant: AlertVariant; text: string }[] = [
        success && !dismissed.has('success') ? { key: 'success', variant: 'success', text: success } : null,
        error && !dismissed.has('error')     ? { key: 'error',   variant: 'error',   text: error }   : null,
        info && !dismissed.has('info')       ? { key: 'info',    variant: 'info',    text: info }    : null,
    ].filter(Boolean) as { key: string; variant: AlertVariant; text: string }[];

    if (messages.length === 0) return null;

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <AnimatePresence>
                {messages.map(({ key, variant, text }) => (
                    <Alert
                        key={key}
                        variant={variant}
                        message={text}
                        onDismiss={() => setDismissed(prev => new Set(prev).add(key))}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

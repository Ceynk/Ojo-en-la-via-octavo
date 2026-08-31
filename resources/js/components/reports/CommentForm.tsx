import { useState } from 'react';
import { Send, Loader2, X } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import type { Comment } from '@/types';

interface CommentFormProps {
    reportId: number;
    parentId?: number;
    onSuccess: (comment: Comment) => void;
    onCancel?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
}

export default function CommentForm({
    reportId,
    parentId,
    onSuccess,
    onCancel,
    placeholder = 'Escribe un comentario…',
    autoFocus = false,
}: CommentFormProps) {
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!body.trim() || loading) return;

        setLoading(true);
        setError(null);

        try {
            const res = await axios.post<{ ok: boolean; comment: Comment }>(
                `/reports/${reportId}/comments`,
                { body: body.trim(), parent_id: parentId ?? null },
            );
            setBody('');
            onSuccess(res.data.comment);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Error al enviar el comentario';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-2">
            <div className={cn(
                'flex items-start gap-2 rounded-xl border bg-surface-primary transition-colors',
                'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20',
                error ? 'border-red-400' : 'border-default',
            )}>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    autoFocus={autoFocus}
                    maxLength={500}
                    disabled={loading}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e as unknown as React.FormEvent);
                    }}
                    className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-primary placeholder:text-muted outline-none"
                />
                <div className="flex items-center gap-1 px-2 py-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-tertiary hover:text-primary"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={!body.trim() || loading}
                        className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                            body.trim()
                                ? 'bg-brand-600 text-white hover:bg-brand-700'
                                : 'text-muted',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                    >
                        {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Send className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted">Ctrl+Enter para enviar</p>
                <span className={cn('text-[10px]', body.length > 450 ? 'text-amber-500' : 'text-muted')}>
                    {body.length}/500
                </span>
            </div>
        </form>
    );
}

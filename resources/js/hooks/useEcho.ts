import { useEffect, useRef } from 'react';
import type Echo from 'laravel-echo';

declare global {
    interface Window {
        Echo: Echo;
        Pusher: unknown;
    }
}

type Handler = (data: unknown) => void;

/**
 * Subscribe to a public Reverb channel.
 * `event` must match the broadcastAs() name on the server (dot prefix added automatically).
 */
export function usePublicChannel(channel: string, event: string, handler: Handler): void {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (typeof window === 'undefined' || !window.Echo) return;

        const ch = window.Echo.channel(channel);
        const cb = (data: unknown) => handlerRef.current(data);
        ch.listen(`.${event}`, cb);

        return () => {
            ch.stopListening(`.${event}`, cb);
        };
    }, [channel, event]);
}

/**
 * Subscribe to a private Reverb channel authenticated by the session.
 * Pass `null` as channel to skip subscription (e.g. when user is not logged in).
 */
export function usePrivateChannel(channel: string | null, event: string, handler: Handler): void {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!channel || typeof window === 'undefined' || !window.Echo) return;

        const ch = window.Echo.private(channel);
        const cb = (data: unknown) => handlerRef.current(data);
        ch.listen(`.${event}`, cb);

        return () => {
            ch.stopListening(`.${event}`, cb);
            // Leave so the auth request isn't re-used stale
            window.Echo.leaveChannel(`private-${channel}`);
        };
    }, [channel, event]);
}

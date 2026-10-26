import axios from 'axios';
import { useEffect, useState } from 'react';

/**
 * Offline report queue.
 *
 * Reports submitted without signal (or whose upload dies on a weak one) are stored on the
 * device in IndexedDB — photos/videos included, as Blobs — and re-sent to POST /reports
 * once the connection comes back. Every queued report carries a `client_uuid` that the
 * server uses as an idempotency key, so a retry of a report that did get through never
 * creates a duplicate (see ReportController::store).
 */

export interface QueuedMedia {
    blob: Blob;
    name: string;
    type: string;
}

export interface QueuedReport {
    client_uuid: string;
    user_id: number;
    incident_type_id: number;
    description: string;
    latitude: number;
    longitude: number;
    address_text: string;
    possible_duplicate_of?: number | null;
    duplicate_similarity?: number | null;
    media: QueuedMedia[];
    /** ISO timestamp of when the citizen submitted it on the device. */
    created_at: string;
    attempts: number;
    /** Set when the server rejected it (422): it won't be retried automatically. */
    rejected_reason?: string | null;
}

const DB_NAME = 'ojo-offline';
const STORE = 'reports';
const CHANGED_EVENT = 'offline-reports:changed';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore(STORE, { keyPath: 'client_uuid' });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => {
                dbPromise = null;
                reject(req.error);
            };
        });
    }
    return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

function notifyChanged() {
    window.dispatchEvent(new Event(CHANGED_EVENT));
}

export async function enqueueReport(report: QueuedReport): Promise<void> {
    await run('readwrite', (s) => s.put(report));
    notifyChanged();
}

export async function listQueuedReports(userId: number): Promise<QueuedReport[]> {
    const all = await run<QueuedReport[]>('readonly', (s) => s.getAll());
    return all
        .filter((r) => r.user_id === userId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function discardQueuedReport(clientUuid: string): Promise<void> {
    await run('readwrite', (s) => s.delete(clientUuid));
    notifyChanged();
}

type SendResult = 'sent' | 'retry-later' | 'rejected';

async function refreshCsrfCookie() {
    // Any normal GET makes Laravel hand out a fresh XSRF-TOKEN cookie, which axios then sends.
    await axios.get('/inicio', { headers: { Accept: 'text/html' } });
}

async function sendQueued(item: QueuedReport, retriedCsrf = false): Promise<SendResult> {
    const fd = new FormData();
    fd.append('client_uuid', item.client_uuid);
    fd.append('incident_type_id', String(item.incident_type_id));
    fd.append('description', item.description);
    fd.append('latitude', String(item.latitude));
    fd.append('longitude', String(item.longitude));
    fd.append('address_text', item.address_text);
    fd.append('offline_created_at', item.created_at);
    if (item.possible_duplicate_of != null) {
        fd.append('possible_duplicate_of', String(item.possible_duplicate_of));
        fd.append('duplicate_similarity', String(item.duplicate_similarity ?? ''));
    }
    for (const m of item.media) {
        fd.append('media[]', new File([m.blob], m.name, { type: m.type }));
    }

    try {
        await axios.post('/reports', fd, {
            headers: { Accept: 'application/json' },
            timeout: 5 * 60 * 1000,
        });
        return 'sent';
    } catch (e) {
        if (!axios.isAxiosError(e) || !e.response) return 'retry-later'; // still no (good) signal

        const status = e.response.status;
        if (status === 419 && !retriedCsrf) {
            try {
                await refreshCsrfCookie();
            } catch {
                return 'retry-later';
            }
            return sendQueued(item, true);
        }
        if (status === 422) {
            const errors = (e.response.data as { errors?: Record<string, string[]> })?.errors ?? {};
            const first = Object.values(errors)[0]?.[0];
            await run('readwrite', (s) =>
                s.put({ ...item, attempts: item.attempts + 1, rejected_reason: first ?? 'Datos inválidos' }),
            );
            notifyChanged();
            return 'rejected';
        }
        // 401/419 (session gone — will go through after the citizen logs in again), 5xx, etc.
        await run('readwrite', (s) => s.put({ ...item, attempts: item.attempts + 1 }));
        return 'retry-later';
    }
}

let flushing: Promise<number> | null = null;

/** Sends every pending report for this user. Resolves with how many got through. */
export function flushQueuedReports(userId: number): Promise<number> {
    if (flushing) return flushing;

    flushing = (async () => {
        let sent = 0;
        try {
            if (!navigator.onLine) return 0;
            const items = (await listQueuedReports(userId)).filter((r) => !r.rejected_reason);
            for (const item of items) {
                const result = await sendQueued(item);
                if (result === 'sent') {
                    await run('readwrite', (s) => s.delete(item.client_uuid));
                    sent++;
                    notifyChanged();
                } else if (result === 'retry-later') {
                    break; // no point hammering the rest while the connection is down
                }
            }
        } catch {
            // IndexedDB unavailable or similar — nothing to flush.
        } finally {
            flushing = null;
        }
        return sent;
    })();

    return flushing;
}

/** Live list of this user's queued reports; re-reads whenever the queue changes. */
export function useQueuedReports(userId: number | null | undefined): QueuedReport[] {
    const [items, setItems] = useState<QueuedReport[]>([]);

    useEffect(() => {
        if (!userId || typeof indexedDB === 'undefined') return;
        let cancelled = false;
        const load = () =>
            listQueuedReports(userId)
                .then((r) => !cancelled && setItems(r))
                .catch(() => {});
        load();
        window.addEventListener(CHANGED_EVENT, load);
        return () => {
            cancelled = true;
            window.removeEventListener(CHANGED_EVENT, load);
        };
    }, [userId]);

    return items;
}

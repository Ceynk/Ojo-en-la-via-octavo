/*
 * Ojo en la Vía — service worker.
 *
 * Goal: the app opens and lets a citizen file a report with no signal at all. The report
 * itself is queued in IndexedDB by the page (resources/js/lib/offlineReports.ts) and sent
 * once there is a connection; this worker only makes sure there's an app to open.
 *
 *  - /build/*  (Vite output, hashed)  → cache-first; the whole build is precached from
 *                                        /build/manifest.json so pages never visited still work.
 *  - page loads (HTML)                → network-first, falls back to the last copy (or /inicio).
 *  - Inertia visits (X-Inertia JSON)  → network-first, falls back to the last copy.
 *  - JSON GETs (e.g. GET /reports)    → network-first, falls back to the last copy.
 *  - /storage, /Logos, map tiles, fonts → cache-first / stale-while-revalidate, size-capped.
 *
 * Network-first requests give up waiting after NETWORK_TIMEOUT_MS when a cached copy exists,
 * so a weak signal doesn't feel like a frozen app. Non-GET requests are never touched.
 */

const VERSION = 'v1';
const ASSETS = `ojo-assets-${VERSION}`;
const PAGES = `ojo-pages-${VERSION}`;
const INERTIA = `ojo-inertia-${VERSION}`;
const DATA = `ojo-data-${VERSION}`;
const MEDIA = `ojo-media-${VERSION}`;
const TILES = `ojo-tiles-${VERSION}`;
const FONTS = `ojo-fonts-${VERSION}`;
const ALL_CACHES = [ASSETS, PAGES, INERTIA, DATA, MEDIA, TILES, FONTS];
// Per-user content: wiped on logout so the next person on this device can't see it offline.
const USER_CACHES = [PAGES, INERTIA, DATA];

const NETWORK_TIMEOUT_MS = 6000;
const MAX_TILES = 800;
const MAX_MEDIA = 300;
const FALLBACK_PAGE = '/inicio';

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(precacheBuild());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            await Promise.all(
                names.filter((n) => n.startsWith('ojo-') && !ALL_CACHES.includes(n)).map((n) => caches.delete(n)),
            );
            await self.clients.claim();
        })(),
    );
});

// The page asks for this on every load, so a new deploy gets precached without having to
// bump the worker itself.
self.addEventListener('message', (event) => {
    if (event.data === 'precache') event.waitUntil(precacheBuild());
});

async function precacheBuild() {
    try {
        const res = await fetch('/build/manifest.json', { cache: 'no-store' });
        if (!res.ok) return; // dev server (`npm run dev`) — nothing built to precache
        const manifest = await res.json();

        const urls = new Set();
        for (const entry of Object.values(manifest)) {
            urls.add(`/build/${entry.file}`);
            (entry.css || []).forEach((f) => urls.add(`/build/${f}`));
            (entry.assets || []).forEach((f) => urls.add(`/build/${f}`));
        }

        const cache = await caches.open(ASSETS);
        // Drop files from previous builds.
        for (const req of await cache.keys()) {
            if (!urls.has(new URL(req.url).pathname)) await cache.delete(req);
        }
        await Promise.all(
            [...urls].map(async (url) => {
                if (await cache.match(url)) return;
                try {
                    const r = await fetch(url);
                    if (r.ok) await cache.put(url, r);
                } catch {
                    /* retried on the next page load */
                }
            }),
        );
    } catch {
        /* offline or no manifest — try again next time */
    }
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;

    if (req.method !== 'GET') {
        if (sameOrigin && req.method === 'POST' && url.pathname === '/logout') {
            event.waitUntil(Promise.all(USER_CACHES.map((n) => caches.delete(n))));
        }
        return;
    }

    if (!sameOrigin) {
        if (url.hostname.endsWith('tile.openstreetmap.org')) {
            event.respondWith(tile(req));
        } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
            event.respondWith(staleWhileRevalidate(req, FONTS));
        }
        return;
    }

    // Never cache the websocket/broadcast auth, health checks or Vite's dev server stuff.
    if (url.pathname.startsWith('/broadcasting') || url.pathname === '/up' || url.pathname.startsWith('/@')) return;

    if (url.pathname.startsWith('/build/')) {
        event.respondWith(cacheFirst(req, ASSETS));
        return;
    }

    if (url.pathname.startsWith('/storage/') || url.pathname.startsWith('/Logos/')) {
        event.respondWith(cacheFirst(req, MEDIA, MAX_MEDIA));
        return;
    }

    if (req.mode === 'navigate') {
        event.respondWith(networkFirst(req, PAGES, { fallbackUrl: FALLBACK_PAGE, offlineHtml: true }));
        return;
    }

    if (req.headers.get('X-Inertia')) {
        // Partial reloads (router.reload({ only: [...] })) carry a subset of props — caching
        // them would overwrite the full page we need offline.
        if (req.headers.get('X-Inertia-Partial-Component')) return;
        event.respondWith(networkFirst(req, INERTIA, { transform: stripInertiaFlash }));
        return;
    }

    const accept = req.headers.get('Accept') || '';
    if (accept.includes('application/json')) {
        event.respondWith(networkFirst(req, DATA));
    }
});

function timeout(ms) {
    return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}

async function networkFirst(req, cacheName, { fallbackUrl, offlineHtml, transform } = {}) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req, { ignoreVary: true });

    const network = fetch(req).then(async (res) => {
        if (res.ok && res.type === 'basic' && !res.redirected) {
            const toStore = transform ? await transform(res.clone()) : res.clone();
            await cache.put(req, toStore);
        }
        return res;
    });

    try {
        // With a cached copy available, don't let a weak signal hang the app.
        const res = cached ? await Promise.race([network, timeout(NETWORK_TIMEOUT_MS)]) : await network;
        if (res) return res;
        network.catch(() => {}); // let it finish in the background and refresh the cache
        return cached;
    } catch {
        if (cached) return cached;
        if (fallbackUrl) {
            const fallback = await cache.match(fallbackUrl, { ignoreVary: true });
            if (fallback) return fallback;
        }
        if (offlineHtml) return offlinePage();
        return Response.error();
    }
}

async function cacheFirst(req, cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
        const res = await fetch(req);
        if (res.ok) {
            await cache.put(req, res.clone());
            if (maxEntries) trim(cache, maxEntries);
        }
        return res;
    } catch {
        return Response.error();
    }
}

async function staleWhileRevalidate(req, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);
    const network = fetch(req)
        .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
        })
        .catch(() => cached || Response.error());
    return cached || network;
}

// Leaflet loads tiles as plain <img> (no-cors), which would give opaque responses that
// browsers bill as several MB each in cache quota. Re-fetch them with CORS instead —
// OpenStreetMap allows it — so each cached tile costs only its real size.
async function tile(req) {
    const cache = await caches.open(TILES);
    const cached = await cache.match(req.url);
    if (cached) return cached;
    try {
        const res = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
        if (res.ok) {
            await cache.put(req.url, res.clone());
            trim(cache, MAX_TILES);
        }
        return res;
    } catch {
        return Response.error();
    }
}

async function trim(cache, maxEntries) {
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - maxEntries; i++) await cache.delete(keys[i]);
}

// A cached Inertia response replayed offline must not re-show an old "Reporte creado" etc.
async function stripInertiaFlash(res) {
    try {
        const page = await res.clone().json();
        if (page && page.props && page.props.flash) {
            for (const key of Object.keys(page.props.flash)) page.props.flash[key] = null;
        }
        return new Response(JSON.stringify(page), { status: res.status, headers: res.headers });
    } catch {
        return res;
    }
}

function offlinePage() {
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Sin conexión — Ojo en la Vía</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:24px}
div{max-width:320px;padding:28px;border-radius:16px;background:rgba(30,41,59,.7);border:1px solid rgba(255,255,255,.1)}
h1{font-size:18px;margin:0 0 8px}p{font-size:14px;color:#94a3b8;margin:0 0 16px}
button{background:#2563eb;color:#fff;border:0;border-radius:10px;padding:10px 18px;font-size:14px}</style></head>
<body><div><h1>Sin conexión</h1><p>Abre la app una vez con señal para poder usarla sin internet.</p>
<button onclick="location.reload()">Reintentar</button></div></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

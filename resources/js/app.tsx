import '../css/app.css';
import './bootstrap';

document.documentElement.classList.add('dark');
import { createRoot } from 'react-dom/client';
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60,
            retry: 1,
        },
    },
});

const appName = document.querySelector('meta[name="app-name"]')?.getAttribute('content') ?? 'Ojo en la Vía';

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob<ResolvedComponent>('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <QueryClientProvider client={queryClient}>
                <App {...props} />
            </QueryClientProvider>,
        );
    },
    progress: {
        color: '#3b82f6',
    },
});

// Offline support (see public/sw.js). Production builds only: against the Vite dev server
// there's no build to precache and stale caches would just get in the way while developing.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then(() => navigator.serviceWorker.ready)
            .then((reg) => reg.active?.postMessage('precache'))
            .catch((error: unknown) => {
                console.warn('No se pudo registrar el service worker.', error);
            });
    });
}

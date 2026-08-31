import '../css/app.css';
import './bootstrap';

document.documentElement.classList.add('dark');
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
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
            import.meta.glob('./pages/**/*.tsx'),
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

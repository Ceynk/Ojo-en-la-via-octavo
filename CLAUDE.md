# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Ojo en la Vía" is a citizen incident-reporting platform (Laravel 13 + Inertia.js + React 19). Citizens report road/infrastructure incidents (potholes, damaged signage, etc.) with photos and geolocation; admins triage and change report status; the platform can email a public entity a magic link so they can update a report's status without logging in.

## Commands

Backend (PHP, run from repo root):
- `composer run dev` — starts the full local dev stack concurrently: `php artisan serve`, `php artisan queue:listen`, and `npm run dev` (Vite). This is the normal way to run the app locally.
- `composer test` (or `php artisan test`) — clears config cache and runs the PHPUnit suite.
- `php artisan test --filter=TestName` — run a single test.
- `vendor/bin/pint` — Laravel Pint code style fixer for PHP.
- `php artisan migrate` — run migrations (SQLite by default, see `.env`).

Frontend (from repo root, Node/npm):
- `npm run dev` — Vite dev server (usually launched via `composer run dev` instead of standalone).
- `npm run build` — production build.
- There is no configured JS/TS lint or test script; TypeScript is checked implicitly by the build (`tsc` is a dependency but no `tsc --noEmit` script exists — run `npx tsc --noEmit` manually if needed).

## Architecture

**Stack**: Laravel 13 (PHP 8.3) backend, Inertia.js v3 bridging to a React 19 + TypeScript SPA-like frontend, Tailwind CSS v4, Vite 8. Real-time updates use Laravel Reverb/Echo (WebSocket broadcasting) and `@tanstack/react-query` for client-side data fetching/caching. SQLite is the default local DB; queue driver is `database`; mail/broadcast default to `log` in `.env.example`.

**Request flow**: `routes/web.php` defines all routes in three groups — guest, authenticated (citizen + nested `admin` prefix, gated by the `admin` middleware), and a public entity magic-link group outside auth entirely. Controllers under `app/Http/Controllers` return `Inertia::render(...)` calls that resolve to `.tsx` files in `resources/js/pages/<Name>.tsx` (path matches the string passed to `Inertia::render`). Simple pages with no controller logic are rendered directly as closures in the route file.

**Shared Inertia props**: `app/Http/Middleware/HandleInertiaRequests.php` shares `auth.user`, flash messages, `notifications_count`, and the global `incident_types` list on every request — check here before adding a new controller-specific prop that's actually needed app-wide.

**Domain model** (`app/Models`): `Report` belongs to `User` and `IncidentType`, has many `ReportImage`, `ReportStatusHistory`, `Comment` (top-level only, threaded via `parent_id`), and polymorphic `Like` (via `likeable`). `EntityNotification` tracks the magic-link flow to external entities (see `EntityUpdateController`) — it carries a token with an expiry check (`isTokenValid()`) and its own status lifecycle (`vista` → `actualizada`). `NotificationRule` (admin-configured) drives `NotificationService`, which creates in-app `Notification` rows (e.g. `notifyStatusChange` on status transitions) and is used by `EntityNotificationService` for entity emails.

**Report status lifecycle**: `pendiente` → `en_revision` → `notificado` → `resuelto` (see label map in `NotificationService::notifyStatusChange`). Status changes are recorded in `ReportStatusHistory` and broadcast via `ReportStatusChanged`/`ReportCreated` events (Reverb), with try/catch around `broadcast()` calls since broadcasting can fail independently of the core status update.

**Authorization**: Policies in `app/Policies` (`ReportPolicy`, `CommentPolicy`, `NotificationPolicy`) gate ownership/edit actions; the `admin` middleware (`app/Http/Middleware/AdminMiddleware.php`) gates the entire `/admin` route group based on `User::isAdmin()` (role-based, not a policy).

**Frontend structure** (`resources/js/`):
- `pages/` mirrors Inertia page names 1:1 — `Admin/`, `Auth/`, `Citizen/`, `Entity/`.
- `components/reports/`, `components/shared/`, `components/ui/`, `components/icons/` — feature components vs. shared layout/chrome vs. shadcn-style primitives vs. custom icons.
- `hooks/useEcho.ts` — wraps Laravel Echo for real-time report/notification updates.
- `store/` — Zustand client state.
- `lib/` — utilities (`utils.ts` for `cn()`-style class merging, `imageCompression.ts` for client-side image compression before upload).
- Path alias `@/*` → `resources/js/*` (configured in both `vite.config.ts` and `tsconfig.json`).
- The `dark` class is force-added to `<html>` in `app.tsx` — this app is dark-mode only, there is no light theme toggle.
- Auth pages share `AuthLayout`/`GlassInput` components; the whole app uses a "glass" (blurred background, translucent panels) visual theme — match it when building new UI rather than introducing a different visual style.

## Notes for making changes

- Never delete report rows (or other user data) from the database as a debugging/verification step — this is a citizen-facing app with real report history.
- When adding a new report status or notification type, update the label map in `NotificationService` and any status-dependent UI (e.g. `StatusTimeline.tsx`, status badges) together — they are not derived from a single shared source of truth.
- `public/Logos/*.png` have large transparent padding baked in; prefer the `-icon.png` cropped variants for compact UI placements (favicons, avatars, small badges).

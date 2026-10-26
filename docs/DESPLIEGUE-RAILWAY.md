# Despliegue en Railway

La app corre en **un solo servicio** de Railway (más una base de datos PostgreSQL). Railway
construye el repo con Railpack (detecta Laravel, instala Composer y npm, ejecuta `npm run build`)
y arranca con [`start-container.sh`](../start-container.sh), que levanta en el mismo contenedor:

| Proceso | Dónde escucha | Para qué |
|---|---|---|
| FrankenPHP (Caddy + PHP) | `$PORT` (dominio público) | La app web. `/app/*` se reenvía a Reverb |
| Reverb | `127.0.0.1:8080` | WebSockets (tiempo real) |
| `queue:work` | — | Correos a entidades, notificaciones, embeddings |

Todo va en un contenedor porque el volumen de fotos (`storage/app/public`) solo se puede montar
en un servicio, y tanto la web como el worker (los correos a entidades incrustan la foto del
reporte) lo necesitan.

En cada despliegue el script ejecuta `migrate --force` y `db:seed --force` (tipos de incidente y
usuario admin; ambos idempotentes), `storage:link` y `optimize`.

## 1. Crear el proyecto

1. En Railway: **New Project → Deploy from GitHub repo** → `yersonh/Ojo-en-la-via-octavo-semestre`.
2. En el mismo proyecto: **+ New → Database → PostgreSQL**.
3. En el servicio de la app → **Settings → Networking → Generate Domain** (puerto: el que
   Railway sugiera, normalmente 8080 / `$PORT`). Anota el dominio, p. ej. `ojo-en-la-via.up.railway.app`.
4. En el servicio de la app → **+ Volume**, ruta de montaje: `/app/storage/app/public`.
   Sin volumen, las fotos subidas se pierden en cada despliegue.

## 2. Variables del servicio de la app

Pégalas en **Variables → Raw Editor** (cambia el dominio y los secretos):

```env
APP_NAME="Ojo en la Vía"
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:GENERAR_CON_php_artisan_key:generate_--show
APP_URL=https://ojo-en-la-via.up.railway.app
APP_LOCALE=es
APP_FALLBACK_LOCALE=es
APP_FAKER_LOCALE=es_CO

LOG_CHANNEL=stderr
LOG_LEVEL=info

DB_CONNECTION=pgsql
DB_URL=${{Postgres.DATABASE_URL}}

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local
BROADCAST_CONNECTION=reverb

# Reverb: el servidor PHP publica eventos a Reverb dentro del contenedor…
REVERB_APP_ID=ojo-prod
REVERB_APP_KEY=CADENA_ALEATORIA_1
REVERB_APP_SECRET=CADENA_ALEATORIA_2
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http

# …y el navegador se conecta por el dominio público (se incrustan al compilar el frontend).
VITE_APP_NAME="${{APP_NAME}}"
VITE_REVERB_APP_KEY=${{REVERB_APP_KEY}}
VITE_REVERB_HOST=${{RAILWAY_PUBLIC_DOMAIN}}
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https

# Correo (Brevo, API HTTP)
MAIL_MAILER=brevo
BREVO_API_KEY=TU_API_KEY_DE_BREVO
MAIL_FROM_ADDRESS="no-reply@tu-dominio-verificado.com"
MAIL_FROM_NAME="${{APP_NAME}}"

# IA (opcional)
GEMINI_API_KEY=
GEMINI_MODEL_FLASH=gemini-flash-lite-latest
GEMINI_MODEL_EMBEDDING=gemini-embedding-2-preview
```

Notas:

- `APP_KEY`: genera una nueva con `php artisan key:generate --show` en tu máquina; no reutilices la de `.env` local.
- `REVERB_APP_KEY` / `REVERB_APP_SECRET`: cualquier cadena aleatoria (p. ej. `openssl rand -hex 16`).
- `Postgres` en `${{Postgres.DATABASE_URL}}` es el nombre del servicio de base de datos; si lo renombraste, ajústalo.
- Las `VITE_*` se leen **al compilar**: si cambias el dominio o la clave de Reverb, vuelve a desplegar (Redeploy).
- `DB_CONNECTION=pgsql` también le indica a Railpack que instale la extensión `pdo_pgsql`.

## 3. Desplegar y verificar

1. Railway despliega solo al hacer push a `main` (o pulsa **Deploy**).
2. En los logs del despliegue deben aparecer `Running migrations ...`, `Starting Reverb ...`,
   `Starting queue worker ...` y `Starting Laravel server ...`.
3. El healthcheck es `GET /up` (configurado en [`railway.json`](../railway.json)).
4. Entra con el admin sembrado: `admin@ojoenlavia.co` / `12345678!` — **cámbiale la contraseña de inmediato**.
5. Tiempo real: abre la app en dos navegadores, crea un reporte en uno y comprueba que aparece en el otro.
   En las DevTools (pestaña Network → WS) debe verse una conexión a `wss://<dominio>/app/<clave>`.

## Datos de demostración (opcional)

Para cargar los ciudadanos, entidades y reportes de ejemplo (con las fotos de `public/demo`), en el
servicio de la app abre una shell (**⋯ → SSH** o `railway ssh`) y ejecuta:

```bash
php artisan db:seed --class=DemoDataSeeder --force
```

Solo inserta datos y se salta a sí mismo si ya existen.

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| El build falla en `composer install` por la versión de PHP | `composer.json` debe pedir `"php": "^8.4"` (las dependencias de Symfony 8 lo exigen); Railpack elige la imagen de PHP a partir de ese valor |
| Estilos/JS cargan por `http://` o redirecciones a `http` | `APP_URL` debe ser `https://…`; los proxies de Railway ya son de confianza (`bootstrap/app.php`) |
| Las fotos desaparecen tras desplegar | Falta el volumen en `/app/storage/app/public` |
| No hay tiempo real | Revisa las `VITE_REVERB_*` y redepliega; el puerto debe ser 443 y el esquema `https` |
| No llegan correos | `BREVO_API_KEY` y un `MAIL_FROM_ADDRESS` verificado en Brevo; los errores salen en los logs del worker |

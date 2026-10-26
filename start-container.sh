#!/bin/bash
#
# Railway start script (Railpack picks up a start-container.sh at the repo root in place of
# its own Laravel one). Runs the whole app in one container so the uploads volume mounted at
# storage/app/public is shared by the web server, the queue worker (entity emails embed the
# report photo) and Reverb:
#
#   FrankenPHP/Caddy  :$PORT  ← public domain; /app/* (WebSockets) is proxied to Reverb
#   Reverb            127.0.0.1:6001 (not 8080: Railway usually sets $PORT=8080)
#   queue:work        background
#
# See docs/DESPLIEGUE-RAILWAY.md.

set -e

if [ "$RAILPACK_SKIP_MIGRATIONS" != "true" ]; then
  echo "Running migrations ..."
  php artisan migrate --force
  # Incident types + admin user; both use firstOrCreate, so re-running on every deploy is safe.
  php artisan db:seed --force
fi

php artisan storage:link --force
php artisan optimize:clear
php artisan optimize

# Keep the background processes alive if they exit (queue:work restarts itself hourly).
supervise() {
  while true; do
    "$@" || echo "[$1 $2] exited with $?, restarting ..."
    sleep 2
  done
}

REVERB_INTERNAL_PORT="${REVERB_SERVER_PORT:-6001}"

echo "Starting Reverb on 127.0.0.1:${REVERB_INTERNAL_PORT} ..."
supervise php artisan reverb:start --host=127.0.0.1 --port="${REVERB_INTERNAL_PORT}" &

echo "Starting queue worker ..."
supervise php artisan queue:work --tries=3 --max-time=3600 --sleep=3 &

# Railpack's Caddyfile expands this inside the site block: browsers reach Reverb through the
# same domain and port as the app (wss://<domain>/app/<key>).
export CADDY_SERVER_EXTRA_DIRECTIVES="handle /app/* {
    reverse_proxy 127.0.0.1:${REVERB_INTERNAL_PORT}
}"

echo "Starting Laravel server ..."
docker-php-entrypoint --config /Caddyfile --adapter caddyfile 2>&1

#!/bin/sh
set -e

# Asegurar carpetas requeridas y permisos
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache \
         /var/www/html/database

# Crear base de datos sqlite si no existe
if [ ! -f /var/www/html/database/database.sqlite ]; then
    touch /var/www/html/database/database.sqlite
fi

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database
chmod 664 /var/www/html/database/database.sqlite

# Crear enlace simbólico de storage
php /var/www/html/artisan storage:link --force || true

# Optimizar cachés si estamos en producción
if [ "$APP_ENV" = "production" ]; then
    php /var/www/html/artisan config:cache || true
    php /var/www/html/artisan route:cache || true
    php /var/www/html/artisan view:cache || true
fi

# Iniciar Supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

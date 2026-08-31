# ==========================================
# Etapa 1: Compilación de Frontend (Vite + React)
# ==========================================
FROM node:20-alpine AS frontend
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# Etapa 2: Entorno de Producción PHP + Nginx
# ==========================================
FROM php:8.4-fpm-alpine

# Instalar dependencias de sistema y herramientas
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    git \
    dos2unix \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    sqlite-dev \
    postgresql-dev \
    icu-dev \
    oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        gd \
        pdo \
        pdo_mysql \
        pdo_pgsql \
        pdo_sqlite \
        zip \
        bcmath \
        opcache \
        mbstring \
        intl \
        pcntl

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copiar código del proyecto
COPY . .

# Copiar assets compilados de React desde la etapa 1
COPY --from=frontend /app/public/build ./public/build

# Instalar dependencias de PHP para producción
RUN composer install --no-dev --no-scripts --optimize-autoloader --no-interaction

# Copiar configuraciones
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Asegurar formato Unix y permisos de ejecución
RUN dos2unix /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

# Permisos de carpetas
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

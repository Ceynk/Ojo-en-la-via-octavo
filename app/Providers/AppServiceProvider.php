<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production') || str_starts_with(env('APP_URL', ''), 'https://')) {
            URL::forceScheme('https');
        }

        // Brevo's HTTP API instead of their SMTP relay — avoids opening an SMTP
        // connection from the queue worker and gives clearer delivery errors.
        Mail::extend('brevo', function (array $config) {
            return (new BrevoTransportFactory())->create(
                new Dsn('brevo+api', 'default', $config['key'] ?? null)
            );
        });

        // The operator's browser pings its GPS position roughly every 5s while
        // navigating; cap it so a runaway client can't flood the location endpoint.
        RateLimiter::for('operator-location', function ($request) {
            return Limit::perMinute(12)->by($request->user()->id);
        });
    }
}

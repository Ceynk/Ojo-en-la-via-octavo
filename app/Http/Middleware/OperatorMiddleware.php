<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class OperatorMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || $request->user()->role !== 'operator' || $request->user()->entity_id === null) {
            abort(403, 'Acceso restringido al panel de operadores.');
        }

        return $next($request);
    }
}

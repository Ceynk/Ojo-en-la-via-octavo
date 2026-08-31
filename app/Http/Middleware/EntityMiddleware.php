<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EntityMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || $request->user()->role !== 'entity' || $request->user()->entity_id === null) {
            abort(403, 'Acceso restringido al panel de entidades.');
        }

        return $next($request);
    }
}

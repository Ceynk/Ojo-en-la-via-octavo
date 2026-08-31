<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'               => $user->id,
                    'name'             => $user->name,
                    'first_name'       => $user->first_name,
                    'last_name'        => $user->last_name,
                    'email'            => $user->email,
                    'phone'            => $user->phone,
                    'document_type'    => $user->document_type,
                    'document_number'  => $user->document_number,
                    'address'          => $user->address,
                    'neighborhood'     => $user->neighborhood,
                    'birth_date'       => $user->birth_date?->toDateString(),
                    'gender'           => $user->gender,
                    'role'             => $user->role,
                    'is_active'        => $user->is_active,
                    'profile_photo'    => $user->profile_photo,
                    'created_at'       => $user->created_at?->toISOString(),
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
                'info'    => fn () => $request->session()->get('info'),
            ],
            'notifications_count' => fn () => $user
                ? $user->notifications()->whereNull('read_at')->count()
                : 0,
            'incident_types' => fn () => \App\Models\IncidentType::orderBy('name')->get(['id', 'name']),
        ];
    }
}

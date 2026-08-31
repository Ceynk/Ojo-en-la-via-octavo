<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();

        $stats = [
            'reports'     => $user->reports()->count(),
            'comments'    => $user->comments()->where('is_deleted', false)->count(),
            'likes_given' => $user->likes()->count(),
        ];

        $myReports = $user->reports()
            ->with(['incidentType:id,name', 'images'])
            ->withCount(['likes', 'comments'])
            ->withExists([
                'likes as user_liked' => fn ($q) => $q->where('user_id', $user->id),
            ])
            ->latest()
            ->limit(6)
            ->get();

        return Inertia::render('Citizen/Profile', [
            'stats'      => $stats,
            'my_reports' => $myReports,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'first_name'      => ['required', 'string', 'max:100'],
            'last_name'       => ['required', 'string', 'max:100'],
            'phone'           => ['required', 'string', 'max:20', 'unique:users,phone,' . $user->id],
            'document_type'   => ['required', 'in:CC,TI,CE,PA'],
            'document_number' => ['required', 'string', 'max:30', 'unique:users,document_number,' . $user->id],
            'address'         => ['required', 'string', 'max:150'],
            'neighborhood'    => ['required', 'string', 'max:100'],
            'birth_date'      => ['required', 'date', 'before:today'],
            'gender'          => ['required', 'in:masculino,femenino,otro,prefiero_no_decir'],
            'profile_photo'   => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        if ($request->hasFile('profile_photo')) {
            if ($user->profile_photo) {
                Storage::disk('public')->delete($user->profile_photo);
            }
            $data['profile_photo'] = $request->file('profile_photo')->store('avatars', 'public');
        }

        $user->update($data);

        return back()->with('success', 'Perfil actualizado correctamente.');
    }
}

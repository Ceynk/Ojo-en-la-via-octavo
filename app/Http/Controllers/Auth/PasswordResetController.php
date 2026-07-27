<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetController extends Controller
{
    public function sendLink(Request $request): RedirectResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $user = User::where('email', $request->email)->first();

        if ($user) {
            $token = Str::random(64);

            DB::table('password_reset_tokens')->upsert(
                ['email' => $user->email, 'token' => Hash::make($token), 'created_at' => now()],
                ['email'],
                ['token', 'created_at'],
            );

            Mail::to($user->email)->queue(new PasswordResetMail($token, $user->name));
        }

        return back()->with('success', 'Si tu correo está registrado, recibirás un enlace en breve.');
    }

    public function showReset(string $token): Response
    {
        return Inertia::render('Auth/ResetPassword', ['token' => $token]);
    }

    public function reset(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'token'                 => ['required'],
            'email'                 => ['required', 'email'],
            'password'              => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $data['email'])->first();

        if (!$record || !Hash::check($data['token'], $record->token)) {
            return back()->withErrors(['email' => 'El enlace de restablecimiento es inválido o ha expirado.']);
        }

        if (now()->diffInHours($record->created_at) > 1) {
            return back()->withErrors(['email' => 'El enlace ha expirado. Solicita uno nuevo.']);
        }

        $user = User::where('email', $data['email'])->firstOrFail();
        $user->update(['password' => Hash::make($data['password'])]);

        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return redirect()->route('login')->with('success', 'Contraseña restablecida. Ya puedes iniciar sesión.');
    }
}

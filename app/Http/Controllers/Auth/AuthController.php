<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !$user->is_active) {
            return back()->withErrors(['email' => 'Credenciales incorrectas o cuenta inactiva.'])->onlyInput('email');
        }

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors(['email' => 'Credenciales incorrectas.'])->onlyInput('email');
        }

        $request->session()->regenerate();

        $user->update(['last_login_at' => now()]);

        // A `redirect` input (from e.g. the entity notification email's login link) takes
        // priority over the role-based default — but only if it's a same-site relative
        // path, never an absolute/external URL, to avoid turning this into an open redirect.
        $redirect = $request->input('redirect');
        if (is_string($redirect) && str_starts_with($redirect, '/') && !str_starts_with($redirect, '//')) {
            return redirect()->intended($redirect);
        }

        return redirect()->intended(match ($user->role) {
            'admin'    => route('admin.dashboard'),
            'entity'   => route('entity.dashboard'),
            'operator' => route('operator.dashboard'),
            default    => route('citizen.home'),
        });
    }

    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'first_name'      => ['required', 'string', 'max:100'],
            'last_name'       => ['required', 'string', 'max:100'],
            'phone'           => ['required', 'string', 'max:20', 'unique:users,phone'],
            'email'           => ['required', 'email', 'unique:users,email'],
            'document_type'   => ['required', 'in:CC,TI,CE,PA'],
            'document_number' => ['required', 'string', 'max:30', 'unique:users,document_number'],
            'address'         => ['required', 'string', 'max:150'],
            'neighborhood'    => ['required', 'string', 'max:100'],
            'birth_date'      => ['required', 'date', 'before:today'],
            'gender'          => ['required', 'in:masculino,femenino,otro,prefiero_no_decir'],
            'password'        => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $user = User::create([
            'first_name'      => $data['first_name'],
            'last_name'       => $data['last_name'],
            'phone'           => $data['phone'],
            'email'           => $data['email'],
            'document_type'   => $data['document_type'],
            'document_number' => $data['document_number'],
            'address'         => $data['address'],
            'neighborhood'    => $data['neighborhood'],
            'birth_date'      => $data['birth_date'],
            'gender'          => $data['gender'],
            'password'        => Hash::make($data['password']),
        ]);

        Auth::login($user);

        return redirect()->route('citizen.home');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}

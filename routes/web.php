<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\IncidentAssistController;
use App\Http\Controllers\ReportDuplicateController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\LikeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminCitizenController;
use App\Http\Controllers\Admin\AdminReportController;
use App\Http\Controllers\Admin\AdminAnalyticsController;
use App\Http\Controllers\Admin\AdminEntityController;
use App\Http\Controllers\Admin\AdminExportController;
use App\Http\Controllers\EntityPanelController;
use App\Http\Controllers\EntityOperatorController;
use App\Http\Controllers\OperatorPanelController;

// ─── Guest routes ─────────────────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/', fn () => Inertia::render('Auth/Login'))->name('home');
    // `redirect` lets an email link (e.g. the entity notification mail) send the user
    // straight to a specific page post-login, separate from Laravel's own automatic
    // "intended URL" mechanism (which only kicks in when a *browser* hits a protected
    // route while logged out — not when the very first request is the login page itself).
    Route::get('/login', fn (Request $request) => Inertia::render('Auth/Login', [
        'redirect' => $request->query('redirect'),
    ]))->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.post');
    Route::get('/register', fn () => Inertia::render('Auth/Register'))->name('register');
    Route::post('/register', [AuthController::class, 'register'])->name('register.post');
    Route::get('/forgot-password', fn () => Inertia::render('Auth/ForgotPassword'))->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'sendLink'])->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'showReset'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'reset'])->name('password.update');
});

// ─── Authenticated routes ──────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Citizen
    Route::get('/inicio', fn () => Inertia::render('Citizen/Home'))->name('citizen.home');
    Route::get('/reportes', fn () => Inertia::render('Citizen/Reports'))->name('citizen.reports');
    Route::get('/perfil', [ProfileController::class, 'show'])->name('citizen.profile');

    // Reports
    Route::post('reportes/asistente-ia', [IncidentAssistController::class, 'suggest'])->name('reports.ai-assist');
    Route::post('reportes/verificar-duplicados', [ReportDuplicateController::class, 'check'])->name('reports.duplicates.check');
    Route::post('reports/{report}/confirmar-duplicado', [ReportDuplicateController::class, 'confirm'])->name('reports.duplicates.confirm');
    Route::apiResource('reports', ReportController::class);

    // Comments
    Route::get('reports/{report}/comments', [CommentController::class, 'index'])->name('comments.index');
    Route::post('reports/{report}/comments', [CommentController::class, 'store'])->name('comments.store');
    Route::put('comments/{comment}', [CommentController::class, 'update'])->name('comments.update');
    Route::delete('comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');

    // Likes
    Route::post('reports/{report}/like', [LikeController::class, 'toggleReport'])->name('likes.report');
    Route::post('comments/{comment}/like', [LikeController::class, 'toggleComment'])->name('likes.comment');

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    // Profile
    Route::put('profile', [ProfileController::class, 'update'])->name('profile.update');

    // ─── Admin routes ────────────────────────────────────────────────────────
    Route::prefix('admin')->name('admin.')->middleware('admin')->group(function () {
        Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
        Route::get('analytics', [AdminAnalyticsController::class, 'index'])->name('analytics');

        Route::get('reports', [AdminReportController::class, 'index'])->name('reports.index');
        Route::get('reports/{report}', [AdminReportController::class, 'show'])->name('reports.show');
        Route::delete('reports/{report}', [AdminReportController::class, 'destroy'])->name('reports.destroy');

        Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
        Route::patch('users/{user}/toggle', [AdminUserController::class, 'toggle'])->name('users.toggle');
        Route::patch('users/{user}/role', [AdminUserController::class, 'changeRole'])->name('users.role');

        Route::get('citizens', [AdminCitizenController::class, 'index'])->name('citizens.index');
        Route::get('citizens/{user}', [AdminCitizenController::class, 'show'])->name('citizens.show');

        Route::apiResource('entities', AdminEntityController::class)->except(['show']);
        Route::patch('entities/{entity}/toggle', [AdminEntityController::class, 'toggle'])->name('entities.toggle');
        Route::post('entities/{entity}/users', [AdminEntityController::class, 'storeUser'])->name('entities.users.store');
        Route::patch('entities/users/{user}/toggle', [AdminEntityController::class, 'toggleUser'])->name('entities.users.toggle');

        Route::post('notifications/send', [NotificationController::class, 'sendMass'])->name('notifications.send');
        Route::get('notifications', [NotificationController::class, 'adminIndex'])->name('notifications.index');

        Route::get('export', [AdminExportController::class, 'index'])->name('export');
        Route::get('export/download', [AdminExportController::class, 'export'])->name('export.download');
    });

    // ─── Entity panel routes ─────────────────────────────────────────────────
    Route::prefix('entidad')->name('entity.')->middleware('entity')->group(function () {
        Route::get('dashboard', [EntityPanelController::class, 'dashboard'])->name('dashboard');
        Route::get('reportes/{report}', [EntityPanelController::class, 'show'])->name('reports.show');
        Route::get('perfil', [EntityPanelController::class, 'profile'])->name('profile');
        Route::put('perfil', [EntityPanelController::class, 'updateProfile'])->name('profile.update');
        Route::put('perfil/password', [EntityPanelController::class, 'updatePassword'])->name('profile.password');
        Route::put('perfil/preferencias', [EntityPanelController::class, 'updatePreferences'])->name('profile.preferences');
        Route::get('info', [EntityPanelController::class, 'infoEdit'])->name('info');
        Route::put('info', [EntityPanelController::class, 'updateInfo'])->name('info.update');
        Route::get('operadores', [EntityOperatorController::class, 'index'])->name('operators.index');
        Route::post('operadores', [EntityOperatorController::class, 'store'])->name('operators.store');
        Route::patch('operadores/{user}/toggle', [EntityOperatorController::class, 'toggle'])->name('operators.toggle');
        Route::get('mapa-operadores', fn () => Inertia::render('Entity/OperatorsMap', [
            'entity' => request()->user()->entity->only(['id', 'name']),
        ]))->name('operators.map');
    });

    // ─── Operator panel routes ───────────────────────────────────────────────
    Route::prefix('operador')->name('operator.')->middleware('operator')->group(function () {
        Route::get('dashboard', [OperatorPanelController::class, 'dashboard'])->name('dashboard');
        Route::post('reportes/{report}/tomar', [OperatorPanelController::class, 'claim'])->name('reports.claim');
        Route::get('reportes/{report}', [OperatorPanelController::class, 'show'])->name('reports.show');
        Route::post('reportes/{report}/en-proceso', [OperatorPanelController::class, 'markEnProceso'])->name('reports.en-proceso');
        Route::post('reportes/{report}/resuelto', [OperatorPanelController::class, 'resolve'])->name('reports.resolve');
        Route::post('ubicacion', [OperatorPanelController::class, 'updateLocation'])
            ->middleware('throttle:operator-location')
            ->name('location.update');
        Route::get('perfil', [EntityPanelController::class, 'operatorProfile'])->name('profile');
        Route::put('perfil', [EntityPanelController::class, 'updateProfile'])->name('profile.update');
        Route::put('perfil/password', [EntityPanelController::class, 'updatePassword'])->name('profile.password');
        Route::put('perfil/preferencias', [EntityPanelController::class, 'updatePreferences'])->name('profile.preferences');
    });
});

<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\LikeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminReportController;
use App\Http\Controllers\Admin\AdminAnalyticsController;
use App\Http\Controllers\Admin\AdminNotificationRuleController;
use App\Http\Controllers\Admin\AdminExportController;

// ─── Guest routes ─────────────────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/', fn () => Inertia::render('Auth/Login'))->name('home');
    Route::get('/login', fn () => Inertia::render('Auth/Login'))->name('login');
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
        Route::patch('reports/{report}/status', [AdminReportController::class, 'updateStatus'])->name('reports.status');
        Route::delete('reports/{report}', [AdminReportController::class, 'destroy'])->name('reports.destroy');

        Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
        Route::patch('users/{user}/toggle', [AdminUserController::class, 'toggle'])->name('users.toggle');
        Route::patch('users/{user}/role', [AdminUserController::class, 'changeRole'])->name('users.role');

        Route::apiResource('rules', AdminNotificationRuleController::class);
        Route::patch('rules/{rule}/toggle', [AdminNotificationRuleController::class, 'toggle'])->name('rules.toggle');

        Route::post('notifications/send', [NotificationController::class, 'sendMass'])->name('notifications.send');
        Route::get('notifications', [NotificationController::class, 'adminIndex'])->name('notifications.index');

        Route::get('export', [AdminExportController::class, 'index'])->name('export');
        Route::get('export/download', [AdminExportController::class, 'export'])->name('export.download');
    });
});

// ─── Entity magic link (public) ───────────────────────────────────────────────
Route::get('entidad/actualizar/{token}', [\App\Http\Controllers\EntityUpdateController::class, 'show'])->name('entity.update');
Route::post('entidad/actualizar/{token}', [\App\Http\Controllers\EntityUpdateController::class, 'update'])->name('entity.update.post');

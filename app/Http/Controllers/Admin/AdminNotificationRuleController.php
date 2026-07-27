<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IncidentType;
use App\Models\NotificationRule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminNotificationRuleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Rules/Index', [
            'rules'          => NotificationRule::with('incidentType:id,name')->get(),
            'incident_types' => IncidentType::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'incident_type_id' => ['required', 'exists:incident_types,id', 'unique:notification_rules,incident_type_id'],
            'entity_email'     => ['required', 'email'],
            'subject_template' => ['required', 'string', 'max:300'],
            'message_template' => ['required', 'string'],
            'priority'         => ['required', 'in:alta,media,baja'],
        ]);

        NotificationRule::create([...$data, 'created_by_user_id' => $request->user()->id]);

        return back()->with('success', 'Regla creada.');
    }

    public function update(Request $request, NotificationRule $rule): RedirectResponse
    {
        $data = $request->validate([
            'entity_email'     => ['required', 'email'],
            'subject_template' => ['required', 'string', 'max:300'],
            'message_template' => ['required', 'string'],
            'priority'         => ['required', 'in:alta,media,baja'],
        ]);

        $rule->update($data);

        return back()->with('success', 'Regla actualizada.');
    }

    public function destroy(NotificationRule $rule): RedirectResponse
    {
        $rule->delete();

        return back()->with('success', 'Regla eliminada.');
    }

    public function toggle(NotificationRule $rule): RedirectResponse
    {
        $rule->update(['is_active' => !$rule->is_active]);

        return back()->with('success', 'Regla ' . ($rule->is_active ? 'activada' : 'desactivada') . '.');
    }
}

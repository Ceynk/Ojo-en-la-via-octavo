<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\ReportConfirmation;
use App\Services\Gemini\DuplicateDetectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportDuplicateController extends Controller
{
    public function __construct(private DuplicateDetectionService $duplicateDetection) {}

    public function check(Request $request): JsonResponse
    {
        $data = $request->validate([
            'description'       => ['required', 'string', 'max:800'],
            'incident_type_id'  => ['required', 'integer', 'exists:incident_types,id'],
            'latitude'          => ['required', 'numeric', 'between:-90,90'],
            'longitude'         => ['required', 'numeric', 'between:-180,180'],
            'photo'             => ['nullable', 'file', 'image', 'mimetypes:image/jpeg,image/png,image/webp', 'max:51200'],
        ]);

        $photoBase64 = null;
        $photoMimeType = null;

        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $photoBase64 = base64_encode(file_get_contents($file->getRealPath()));
            $photoMimeType = $file->getMimeType();
        }

        $duplicates = $this->duplicateDetection->findPossibleDuplicates(
            description: $data['description'],
            photoBase64: $photoBase64,
            photoMimeType: $photoMimeType,
            incidentTypeId: (int) $data['incident_type_id'],
            lat: (float) $data['latitude'],
            lng: (float) $data['longitude'],
        );

        return response()->json(['duplicates' => $duplicates]);
    }

    /**
     * Citizen confirmed "es el mismo problema": corroborates the existing report
     * instead of a new one being created.
     */
    public function confirm(Request $request, Report $report): JsonResponse
    {
        ReportConfirmation::firstOrCreate([
            'report_id' => $report->id,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'confirmed' => true,
            'confirmations_count' => $report->confirmations()->count(),
        ]);
    }
}

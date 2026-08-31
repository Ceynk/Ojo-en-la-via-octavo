<?php

namespace App\Http\Controllers;

use App\Services\Gemini\IncidentAssistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncidentAssistController extends Controller
{
    public function __construct(private IncidentAssistService $assistant) {}

    public function suggest(Request $request): JsonResponse
    {
        $data = $request->validate([
            // Classification can run off the photo alone — the citizen may not have
            // typed a description yet when the photo triggers the assistant.
            'description' => ['nullable', 'string', 'max:800'],
            'photo' => ['required', 'file', 'image', 'mimetypes:image/jpeg,image/png,image/webp', 'max:51200'],
        ]);

        $file = $request->file('photo');
        $photoBase64 = base64_encode(file_get_contents($file->getRealPath()));
        $photoMimeType = $file->getMimeType();

        $result = $this->assistant->suggestClassification($data['description'] ?? '', $photoBase64, $photoMimeType);

        return response()->json($result);
    }
}

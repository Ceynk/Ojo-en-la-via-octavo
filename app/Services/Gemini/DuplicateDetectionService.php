<?php

namespace App\Services\Gemini;

use App\Models\Report;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DuplicateDetectionService
{
    public function __construct(private GeminiClient $client) {}

    /**
     * Embeds a report's own description + first photo, for storage in report_embeddings.
     * Returns null (never throws) if Gemini fails or the report has no readable photo file.
     */
    public function generateEmbeddingForReport(Report $report): ?array
    {
        $photoBase64 = null;
        $photoMimeType = null;

        // A report can carry several photos/videos: always use the FIRST photo ever
        // attached (ordered by id, i.e. upload order) — never a video, and never a
        // later photo, no matter what else was added before or after it.
        $image = $report->images()->where('type', 'image')->orderBy('id')->first();

        if ($image) {
            $absolutePath = Storage::disk('public')->path($image->path);

            if (is_file($absolutePath)) {
                $photoBase64 = base64_encode(file_get_contents($absolutePath));
                $photoMimeType = Storage::disk('public')->mimeType($image->path) ?: 'image/jpeg';
            }
        }

        return $this->embed($report->description, $photoBase64, $photoMimeType);
    }

    /**
     * Best-effort duplicate search for a report the citizen is about to submit.
     * Any Gemini failure results in an empty array, never an exception.
     *
     * @return array<int, array{report_id: int, similarity: float, description: string, photo_path: ?string, address_text: string, created_at: string}>
     */
    public function findPossibleDuplicates(
        string $description,
        ?string $photoBase64,
        ?string $photoMimeType,
        int $incidentTypeId,
        float $lat,
        float $lng,
        float $radiusMeters = 150,
        int $daysBack = 15,
        float $similarityThreshold = 0.85,
    ): array {
        try {
            $newEmbedding = $this->embed($description, $photoBase64, $photoMimeType);

            if ($newEmbedding === null) {
                return [];
            }

            $candidates = $this->candidateReports($incidentTypeId, $lat, $lng, $radiusMeters, $daysBack);

            $results = [];

            foreach ($candidates as $candidate) {
                if (! $candidate->embedding) {
                    // No embedding yet (job still pending or failed) — skip rather than
                    // generate on-demand, so this endpoint stays fast.
                    continue;
                }

                $similarity = $this->cosineSimilarity($newEmbedding, $candidate->embedding->embedding);

                if ($similarity >= $similarityThreshold) {
                    $image = $candidate->images->first();

                    $results[] = [
                        'report_id' => $candidate->id,
                        'similarity' => round($similarity, 4),
                        'distance_meters' => round($this->haversineMeters($lat, $lng, $candidate->latitude, $candidate->longitude)),
                        'description' => $candidate->description,
                        'photo_path' => $image?->path,
                        'address_text' => $candidate->address_text,
                        'created_at' => $candidate->created_at->toIso8601String(),
                    ];
                }
            }

            usort($results, fn ($a, $b) => $b['similarity'] <=> $a['similarity']);

            return $results;
        } catch (Throwable $e) {
            Log::warning('Duplicate detection failed', ['error' => $e->getMessage()]);

            return [];
        }
    }

    private function embed(string $description, ?string $photoBase64, ?string $photoMimeType): ?array
    {
        try {
            $parts = [['text' => $description]];

            if ($photoBase64 !== null && $photoMimeType !== null) {
                $parts[] = [
                    'inline_data' => [
                        'mime_type' => $photoMimeType,
                        'data' => $photoBase64,
                    ],
                ];
            }

            $response = $this->client->embedContent(['parts' => $parts]);

            return $response['embedding']['values'] ?? null;
        } catch (GeminiException) {
            return null;
        }
    }

    /**
     * Same incident type, recent, within radiusMeters. SQLite has no trig functions to run
     * an exact haversine filter in SQL, so we narrow with a cheap bounding-box WHERE clause
     * first and then apply the precise haversine check in PHP over that (small) result set.
     */
    private function candidateReports(int $incidentTypeId, float $lat, float $lng, float $radiusMeters, int $daysBack)
    {
        $latDelta = $radiusMeters / 111_320;
        $lngDelta = $radiusMeters / (111_320 * max(cos(deg2rad($lat)), 0.01));

        return Report::query()
            ->with(['embedding', 'images' => fn ($q) => $q->where('type', 'image')->orderBy('id')])
            ->where('incident_type_id', $incidentTypeId)
            ->where('created_at', '>=', now()->subDays($daysBack))
            ->whereBetween('latitude', [$lat - $latDelta, $lat + $latDelta])
            ->whereBetween('longitude', [$lng - $lngDelta, $lng + $lngDelta])
            ->get()
            ->filter(fn (Report $r) => $this->haversineMeters($lat, $lng, $r->latitude, $r->longitude) <= $radiusMeters);
    }

    private function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6_371_000;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function cosineSimilarity(array $a, array $b): float
    {
        $count = min(count($a), count($b));

        if ($count === 0) {
            return 0.0;
        }

        $dot = 0.0;
        $normA = 0.0;
        $normB = 0.0;

        for ($i = 0; $i < $count; $i++) {
            $dot += $a[$i] * $b[$i];
            $normA += $a[$i] ** 2;
            $normB += $b[$i] ** 2;
        }

        if ($normA === 0.0 || $normB === 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($normA) * sqrt($normB));
    }
}

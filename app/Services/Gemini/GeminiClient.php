<?php

namespace App\Services\Gemini;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class GeminiClient
{
    protected string $apiKey;

    protected string $baseUrl;

    public function __construct()
    {
        $apiKey = config('gemini.api_key');

        if (empty($apiKey)) {
            throw new GeminiException(
                'GEMINI_API_KEY is not set. Add it to your .env file before using GeminiClient.'
            );
        }

        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim(config('gemini.base_url'), '/');
    }

    /**
     * @param  array  $contents  Gemini "contents" array, e.g. [['role' => 'user', 'parts' => [['text' => '...']]]]
     * @param  array|null  $responseSchema  Gemini responseSchema for structured JSON output
     */
    public function generateContent(array $contents, ?array $responseSchema = null, ?string $model = null): array
    {
        $model ??= config('gemini.models.flash');

        $payload = ['contents' => $contents];

        if ($responseSchema !== null) {
            $payload['generationConfig'] = [
                'responseMimeType' => 'application/json',
                'responseSchema' => $responseSchema,
            ];
        }

        return $this->post("v1beta/models/{$model}:generateContent", $payload);
    }

    /**
     * @param  array  $content  Gemini "content" object, e.g. ['parts' => [['text' => '...']]]
     */
    public function embedContent(array $content, ?string $model = null): array
    {
        $model ??= config('gemini.models.embedding');

        return $this->post("v1beta/models/{$model}:embedContent", [
            'content' => $content,
        ]);
    }

    protected function post(string $path, array $payload): array
    {
        try {
            $response = Http::timeout(8)
                ->retry(2, 200)
                ->post("{$this->baseUrl}/{$path}?key={$this->apiKey}", $payload);

            if ($response->failed()) {
                Log::warning('Gemini API request failed', [
                    'path' => $path,
                    'status' => $response->status(),
                    'body' => $response->json() ?? $response->body(),
                ]);

                throw new GeminiException("Gemini API request to \"{$path}\" failed with status {$response->status()}.");
            }

            return $response->json() ?? [];
        } catch (GeminiException $e) {
            throw $e;
        } catch (Throwable $e) {
            $message = $this->redactApiKey($e->getMessage());

            Log::warning('Gemini API request threw an exception', [
                'path' => $path,
                'message' => $message,
            ]);

            throw new GeminiException("Gemini API request to \"{$path}\" failed: {$message}", previous: $e);
        }
    }

    /**
     * Strip the API key out of error strings that may embed the full
     * request URL (e.g. cURL/connection errors), so it never ends up
     * in logs or exception messages.
     */
    protected function redactApiKey(string $message): string
    {
        return str_replace($this->apiKey, '[REDACTED]', $message);
    }
}

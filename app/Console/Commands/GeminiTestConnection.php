<?php

namespace App\Console\Commands;

use App\Services\Gemini\GeminiClient;
use App\Services\Gemini\GeminiException;
use Illuminate\Console\Command;

class GeminiTestConnection extends Command
{
    protected $signature = 'gemini:test-connection';

    protected $description = 'Send a trivial request to the Gemini API to confirm the configured key works';

    public function handle(): int
    {
        $this->info('Testing Gemini API connection...');

        try {
            $client = new GeminiClient;

            $response = $client->generateContent([
                ['role' => 'user', 'parts' => [['text' => 'responde solo con la palabra: ok']]],
            ]);

            $text = $response['candidates'][0]['content']['parts'][0]['text'] ?? null;

            if ($text === null) {
                $this->error('Gemini responded, but no text was found in the expected shape:');
                $this->line(json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

                return self::FAILURE;
            }

            $this->info('Gemini API key is working. Response:');
            $this->line(trim($text));

            return self::SUCCESS;
        } catch (GeminiException $e) {
            $this->error('Gemini connection test failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}

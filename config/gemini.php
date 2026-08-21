<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Gemini API credentials
    |--------------------------------------------------------------------------
    |
    | No default is provided for the API key on purpose: GeminiClient checks
    | for it explicitly and throws a clear GeminiException when it's missing,
    | rather than silently sending an empty/invalid key to Google.
    |
    */

    'api_key' => env('GEMINI_API_KEY'),

    'base_url' => env('GEMINI_API_BASE', 'https://generativelanguage.googleapis.com'),

    'models' => [
        'flash' => env('GEMINI_MODEL_FLASH', 'gemini-flash-lite-latest'),
        'embedding' => env('GEMINI_MODEL_EMBEDDING', 'gemini-embedding-001'),
    ],

];

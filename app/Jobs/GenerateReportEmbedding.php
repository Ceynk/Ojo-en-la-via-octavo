<?php

namespace App\Jobs;

use App\Models\Report;
use App\Models\ReportEmbedding;
use App\Services\Gemini\DuplicateDetectionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateReportEmbedding implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Report $report) {}

    public function handle(DuplicateDetectionService $duplicateDetection): void
    {
        $vector = $duplicateDetection->generateEmbeddingForReport($this->report);

        if ($vector === null) {
            return;
        }

        ReportEmbedding::updateOrCreate(
            ['report_id' => $this->report->id],
            ['embedding' => $vector, 'model' => config('gemini.models.embedding'), 'created_at' => now()],
        );
    }
}

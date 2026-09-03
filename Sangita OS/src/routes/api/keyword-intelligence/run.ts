import { createFileRoute } from "@tanstack/react-router";
import { getKeywordIntelligenceStore } from "@/lib/keyword-intelligence/store";
import { getKeywordStore } from "@/lib/keywords/store";
import {
  orchestrateDailyRun,
  buildRegionConfig,
  buildKeywordTemplate,
  buildIntelligenceConfig,
  DailyRunInput,
} from "@/lib/keyword-intelligence/service";
import { submitDailyKeywordsToLeadFinder } from "@/lib/keyword-intelligence/lead-finder-client";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();

        const startTime = Date.now();

        try {
          const body = await request.json().catch(() => ({}));
          const forceDate = body.date ? new Date(body.date) : new Date(); // Allow manual date override for testing
          const dryRun = body.dryRun === true;

          const intelStore = getKeywordIntelligenceStore();
          const keywordStore = getKeywordStore();

          // Fetch all required data
          const [regions, templates, poolKeywords, performance, config, todayCounts, recentRuns] =
            await Promise.all([
              intelStore.listRegions(),
              intelStore.listTemplates(),
              keywordStore.list(),
              (async () => {
                // Get performance for all regions
                const allPerf = new Map<string, any>();
                for (const region of regions) {
                  if (!region.isActive) continue;
                  const perf = await intelStore.getKeywordPerformance(
                    region.regionCode,
                    config.analysisWindowDays,
                  );
                  for (const p of perf) allPerf.set(p.keywordId, p);
                }
                return allPerf;
              })(),
              intelStore.getConfig(),
              keywordStore.getTodayCounts(forceDate),
              intelStore.listDailyRuns(10),
            ]);

          // Build input for orchestration
          const input: DailyRunInput = {
            runDate: forceDate,
            regions: regions.map(buildRegionConfig),
            templates: templates.map(buildKeywordTemplate),
            poolKeywords,
            keywordPerformance: performance,
            recentKeywordNorms: await intelStore.getRecentKeywordNorms(
              config.duplicationAvoidanceDays,
            ),
            config: buildIntelligenceConfig(
              Object.entries(config).map(([k, v]) => ({ config_key: k, config_value: v })),
            ),
            todayCounts,
            previousRuns: recentRuns.map((r) => ({ regionCode: r.regionCode, runDate: r.runDate })),
          };

          // Orchestrate the daily run
          const { run, leadFinderPayloads } = orchestrateDailyRun(input);

          // Create run record
          const createdRun = await intelStore.createDailyRun(run);

          // Insert selections
          await intelStore.insertDailySelections(run.selectedKeywords, run.runId);

          // Update run status to running
          await intelStore.updateDailyRun(run.runId, {
            status: "running",
            startedAt: new Date().toISOString(),
          });

          let leadFinderResult = null;

          if (!dryRun && config.enableLeadFinderIntegration && leadFinderPayloads.length > 0) {
            // Submit to Lead Finder
            leadFinderResult = await submitDailyKeywordsToLeadFinder({
              payloads: leadFinderPayloads,
              runId: run.runId,
              date: run.runDate,
              batchSize: config.leadFinderBatchSize,
            });

            // Update run with results
            await intelStore.updateDailyRun(run.runId, {
              status: leadFinderResult.success ? "completed" : "partial",
              totalSearchesInitiated: leadFinderResult.totalSubmitted,
              leadFinderJobIds: leadFinderResult.jobs.map((j) => j.jobId),
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - startTime,
            });

            // Add job IDs to run
            await intelStore.addLeadFinderJobIds(
              run.runId,
              leadFinderResult.jobs.map((j) => j.jobId),
            );
          } else {
            // Dry run or integration disabled
            await intelStore.updateDailyRun(run.runId, {
              status: "completed",
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - startTime,
            });
          }

          // Return comprehensive result
          return json({
            run: createdRun,
            selectedKeywords: run.selectedKeywords,
            leadFinderPayloads: leadFinderPayloads.map((p) => ({
              keyword: p.keyword,
              source: p.source,
              dailyTarget: p.dailyTarget,
              priority: p.priority,
              regionCode: p.regionCode,
              selectionReason: p.selectionReason,
            })),
            leadFinderResult: leadFinderResult
              ? {
                  success: leadFinderResult.success,
                  totalSubmitted: leadFinderResult.totalSubmitted,
                  totalFailed: leadFinderResult.totalFailed,
                  jobs: leadFinderResult.jobs.map((j) => ({
                    jobId: j.jobId,
                    keyword: j.keyword,
                    status: j.status,
                  })),
                  failed: leadFinderResult.failed,
                }
              : { dryRun: true, message: "Dry run or Lead Finder integration disabled" },
            durationMs: Date.now() - startTime,
          });
        } catch (e) {
          console.error("[keyword-intelligence/run POST]", e);

          // Try to update run status if we have a runId
          // (In practice, the run would have been created before the error)

          return errorJson(e instanceof Error ? e.message : "Failed to execute daily run", 500);
        }
      },
    },
  },
});

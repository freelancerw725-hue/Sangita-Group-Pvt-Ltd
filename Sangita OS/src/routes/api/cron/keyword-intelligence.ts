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

/**
 * Cron endpoint for daily keyword intelligence execution.
 * Called by Vercel Cron (or external scheduler) once per day.
 * Secured with CRON_SECRET to prevent unauthorized execution.
 */
export const Route = createFileRoute("/api/cron/keyword-intelligence")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const startTime = Date.now();

        // Verify cron secret
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = request.headers.get("authorization");
        const url = new URL(request.url);
        const querySecret = url.searchParams.get("secret");

        const providedSecret = authHeader?.replace("Bearer ", "") || querySecret;
        if (cronSecret && providedSecret !== cronSecret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        try {
          const intelStore = getKeywordIntelligenceStore();
          const keywordStore = getKeywordStore();

          // Fetch all required data
          const [regions, templates, poolKeywords, config, todayCounts, recentRuns] =
            await Promise.all([
              intelStore.listRegions(),
              intelStore.listTemplates(),
              keywordStore.list(),
              intelStore.getConfig(),
              keywordStore.getTodayCounts(new Date()),
              intelStore.listDailyRuns(10),
            ]);

          // Check if already run today
          const today = new Date().toISOString().split("T")[0];
          const existingRun = await intelStore.getDailyRunByDate(today);
          if (existingRun && existingRun.status === "completed") {
            return new Response(
              JSON.stringify({
                message: "Already run today",
                run: existingRun,
                skipped: true,
              }),
              {
                status: 200,
                headers: { "content-type": "application/json" },
              },
            );
          }

          // Get performance for all active regions
          const performance = new Map<string, any>();
          for (const region of regions.filter((r) => r.isActive)) {
            const perf = await intelStore.getKeywordPerformance(
              region.regionCode,
              config.analysisWindowDays,
            );
            for (const p of perf) performance.set(p.keywordId, p);
          }

          const recentNorms = await intelStore.getRecentKeywordNorms(
            config.duplicationAvoidanceDays,
          );

          // Build input
          const input: DailyRunInput = {
            runDate: new Date(),
            regions: regions.map(buildRegionConfig),
            templates: templates.map(buildKeywordTemplate),
            poolKeywords,
            keywordPerformance: performance,
            recentKeywordNorms: recentNorms,
            config: buildIntelligenceConfig(
              Object.entries(config).map(([k, v]) => ({ config_key: k, config_value: v })),
            ),
            todayCounts,
            previousRuns: recentRuns.map((r) => ({ regionCode: r.regionCode, runDate: r.runDate })),
          };

          // Orchestrate
          const { run, leadFinderPayloads } = orchestrateDailyRun(input);

          // Create run record
          const createdRun = await intelStore.createDailyRun(run);
          await intelStore.insertDailySelections(run.selectedKeywords, run.runId);
          await intelStore.updateDailyRun(run.runId, {
            status: "running",
            startedAt: new Date().toISOString(),
          });

          let leadFinderResult = null;

          if (config.enableLeadFinderIntegration && leadFinderPayloads.length > 0) {
            leadFinderResult = await submitDailyKeywordsToLeadFinder({
              payloads: leadFinderPayloads,
              runId: run.runId,
              date: run.runDate,
              batchSize: config.leadFinderBatchSize,
            });

            await intelStore.updateDailyRun(run.runId, {
              status: leadFinderResult.success ? "completed" : "partial",
              totalSearchesInitiated: leadFinderResult.totalSubmitted,
              leadFinderJobIds: leadFinderResult.jobs.map((j) => j.jobId),
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - startTime,
            });

            await intelStore.addLeadFinderJobIds(
              run.runId,
              leadFinderResult.jobs.map((j) => j.jobId),
            );
          } else {
            await intelStore.updateDailyRun(run.runId, {
              status: "completed",
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - startTime,
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              run: createdRun,
              selectedCount: run.selectedKeywords.length,
              leadFinderResult: leadFinderResult
                ? {
                    success: leadFinderResult.success,
                    totalSubmitted: leadFinderResult.totalSubmitted,
                    totalFailed: leadFinderResult.totalFailed,
                  }
                : { skipped: true, reason: "Integration disabled or no keywords" },
              durationMs: Date.now() - startTime,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        } catch (error) {
          console.error("[cron/keyword-intelligence] Error:", error);

          // Try to notify if configured
          // In production, you'd integrate with a notification service here

          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
              durationMs: Date.now() - startTime,
            }),
            {
              status: 500,
              headers: { "content-type": "application/json" },
            },
          );
        }
      },
      // Also support POST for manual triggering
      POST: async ({ request }) => {
        // Reuse GET logic but allow manual trigger with optional date override
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = request.headers.get("authorization");
        const providedSecret = authHeader?.replace("Bearer ", "");

        // For POST, allow internal calls without secret (from same origin)
        const isInternal = request.headers.get("x-internal-call") === "true";
        if (cronSecret && providedSecret !== cronSecret && !isInternal) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        // Forward to GET handler logic
        const body = await request.json().catch(() => ({}));
        const forceDate = body.date ? new Date(body.date) : new Date();

        // ... same logic as GET but with forceDate
        // For brevity, we'd extract the core logic to a shared function
        return new Response(
          JSON.stringify({ message: "Use GET with secret for cron, or implement POST logic" }),
          {
            status: 501,
            headers: { "content-type": "application/json" },
          },
        );
      },
    },
  },
});

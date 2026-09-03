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
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const url = new URL(request.url);
          const regionCode = url.searchParams.get("regionCode") || undefined;
          const forceDate = url.searchParams.get("date")
            ? new Date(url.searchParams.get("date")!)
            : new Date();

          const intelStore = getKeywordIntelligenceStore();
          const keywordStore = getKeywordStore();

          const [regions, templates, poolKeywords, config, todayCounts] = await Promise.all([
            intelStore.listRegions(),
            intelStore.listTemplates(),
            keywordStore.list(),
            intelStore.getConfig(),
            keywordStore.getTodayCounts(forceDate),
          ]);

          // Filter regions if specified
          const targetRegions = regionCode
            ? regions.filter((r) => r.regionCode === regionCode)
            : regions.filter((r) => r.isActive);

          if (targetRegions.length === 0) {
            return errorJson("No active regions found", 404);
          }

          // Get performance for all regions
          const performance = new Map<string, any>();
          for (const region of targetRegions) {
            const perf = await intelStore.getKeywordPerformance(
              region.regionCode,
              config.analysisWindowDays,
            );
            for (const p of perf) performance.set(p.keywordId, p);
          }

          const recentRuns = await intelStore.listDailyRuns(10);
          const recentNorms = await intelStore.getRecentKeywordNorms(
            config.duplicationAvoidanceDays,
          );

          const previews = [];

          for (const region of targetRegions) {
            const input: DailyRunInput = {
              runDate: forceDate,
              regions: [buildRegionConfig(region)],
              templates: templates.map(buildKeywordTemplate),
              poolKeywords,
              keywordPerformance: performance,
              recentKeywordNorms: recentNorms,
              config: buildIntelligenceConfig(
                Object.entries(config).map(([k, v]) => ({ config_key: k, config_value: v })),
              ),
              todayCounts,
              previousRuns: recentRuns.map((r) => ({
                regionCode: r.regionCode,
                runDate: r.runDate,
              })),
            };

            try {
              const { run, leadFinderPayloads } = orchestrateDailyRun(input);
              previews.push({
                region: region.regionCode,
                regionName: region.regionName,
                selectedCount: run.selectedKeywords.length,
                keywords: run.selectedKeywords.map((k) => ({
                  keyword: k.keyword,
                  source: k.source,
                  priority: k.priority,
                  dailyTarget: k.dailyTarget,
                  selectionReason: k.selectionReason,
                  performanceScore: k.performanceScore,
                  templateId: k.templateId,
                })),
              });
            } catch (e) {
              previews.push({
                region: region.regionCode,
                regionName: region.regionName,
                error: e instanceof Error ? e.message : "Preview failed",
              });
            }
          }

          return json({ previews, date: forceDate.toISOString().split("T")[0] });
        } catch (e) {
          console.error("[keyword-intelligence/preview GET]", e);
          return errorJson("Failed to generate preview", 500);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { getKeywordIntelligenceStore } from "@/lib/keyword-intelligence/store";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/performance")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const url = new URL(request.url);
          const regionCode = url.searchParams.get("regionCode") || undefined;
          const windowDays = Math.min(
            Math.max(Number(url.searchParams.get("windowDays") ?? 30), 1),
            365,
          );
          const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 100), 1), 500);

          const store = getKeywordIntelligenceStore();

          if (!regionCode) {
            return errorJson("regionCode parameter required", 400);
          }

          const performance = await store.getKeywordPerformance(regionCode, windowDays);

          return json({
            regionCode,
            windowDays,
            performance: performance.slice(0, limit),
            total: performance.length,
          });
        } catch (e) {
          console.error("[keyword-intelligence/performance GET]", e);
          return errorJson("Failed to get performance", 500);
        }
      },
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const body = await request.json().catch(() => null);
          const windowDays = Math.min(Math.max(Number(body?.windowDays ?? 30), 1), 365);

          const store = getKeywordIntelligenceStore();
          const updated = await store.recalculateAllPerformance(windowDays);

          return json({ message: `Recalculated performance for ${updated} keywords`, updated });
        } catch (e) {
          console.error("[keyword-intelligence/performance POST]", e);
          return errorJson("Failed to recalculate performance", 500);
        }
      },
    },
  },
});

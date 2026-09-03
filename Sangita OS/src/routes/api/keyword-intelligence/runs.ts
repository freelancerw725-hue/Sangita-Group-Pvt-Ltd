import { createFileRoute } from "@tanstack/react-router";
import { getKeywordIntelligenceStore } from "@/lib/keyword-intelligence/store";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/runs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const url = new URL(request.url);
          const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);
          const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
          const status = url.searchParams.get("status") || undefined;
          const regionCode = url.searchParams.get("regionCode") || undefined;

          const store = getKeywordIntelligenceStore();
          let runs = await store.listDailyRuns(limit + offset, 0);

          if (status) runs = runs.filter((r) => r.status === status);
          if (regionCode) runs = runs.filter((r) => r.regionCode === regionCode);

          return json({
            runs: runs.slice(0, limit),
            total: runs.length,
            limit,
            offset,
          });
        } catch (e) {
          console.error("[keyword-intelligence/runs GET]", e);
          return errorJson("Failed to list runs", 500);
        }
      },
    },
  },
});

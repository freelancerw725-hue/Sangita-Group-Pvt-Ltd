import { createFileRoute } from "@tanstack/react-router";
import { getKeywordStore } from "@/lib/dashboard/server";
import { selectNextActiveKeyword, toAutomationPayload } from "@/lib/keywords/service";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keywords/next")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const store = getKeywordStore();
          const keywords = await store.list();
          const todayCounts = await store.getTodayCounts(new Date());
          const next = selectNextActiveKeyword(keywords, todayCounts);
          if (!next) {
            return json(
              {
                keyword: null,
                message:
                  "No eligible active keyword (all paused/completed or daily targets reached)",
              },
              { status: 204 },
            );
          }
          // Spec example response: { keyword, source, dailyTarget, priority }
          // We also include id/normalized for traceability but keep spec fields at top
          const payload = toAutomationPayload(next);
          // Also record implicit search_started? No — Phase 1 only returns next; n8n will call usage API.
          return json({
            ...payload,
            id: next.id,
            normalizedKeyword: next.normalizedKeyword,
            status: next.status,
          });
        } catch (e) {
          console.error("[keywords/next GET]", e);
          return errorJson("Failed to get next keyword", 500);
        }
      },
    },
  },
});

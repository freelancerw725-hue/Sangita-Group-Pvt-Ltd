import { createFileRoute } from "@tanstack/react-router";
import { getKeywordIntelligenceStore } from "@/lib/keyword-intelligence/store";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/runs/$runId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const { runId } = params;
          const store = getKeywordIntelligenceStore();

          const [run, selections] = await Promise.all([
            store.getDailyRun(runId),
            store.getDailySelections(runId),
          ]);

          if (!run) {
            return errorJson("Run not found", 404);
          }

          return json({ run, selections });
        } catch (e) {
          console.error("[keyword-intelligence/runs/$runId GET]", e);
          return errorJson("Failed to get run", 500);
        }
      },
    },
  },
});

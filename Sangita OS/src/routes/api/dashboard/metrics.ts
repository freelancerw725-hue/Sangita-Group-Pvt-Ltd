import { createFileRoute } from "@tanstack/react-router";
import { getDashboardMetrics } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/dashboard/metrics")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const metrics = await getDashboardMetrics();
          return json({ metrics });
        } catch (e) {
          console.error("[dashboard/metrics] Error:", e);
          return errorJson("Failed to fetch dashboard metrics", 500);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { getTaskMetrics } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/dashboard/tasks")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const metrics = await getTaskMetrics();
          return json({ metrics });
        } catch (e) {
          console.error("[dashboard/tasks] Error:", e);
          return errorJson("Failed to fetch task metrics", 500);
        }
      },
    },
  },
});

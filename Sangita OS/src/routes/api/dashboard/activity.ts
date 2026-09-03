import { createFileRoute } from "@tanstack/react-router";
import { getRecentActivity, getAutomationHealth } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/dashboard/activity")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [activities, automation] = await Promise.all([
            getRecentActivity(50),
            getAutomationHealth(),
          ]);
          return json({ activities, automation });
        } catch (e) {
          console.error("[dashboard/activity] Error:", e);
          return errorJson("Failed to fetch activity", 500);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { getCustomerMetrics } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/dashboard/customers")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const metrics = await getCustomerMetrics();
          return json({ metrics });
        } catch (e) {
          console.error("[dashboard/customers] Error:", e);
          return errorJson("Failed to fetch customer metrics", 500);
        }
      },
    },
  },
});

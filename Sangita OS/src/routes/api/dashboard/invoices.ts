import { createFileRoute } from "@tanstack/react-router";
import { getInvoiceMetrics } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/dashboard/invoices")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const metrics = await getInvoiceMetrics();
          return json({ metrics });
        } catch (e) {
          console.error("[dashboard/invoices] Error:", e);
          return errorJson("Failed to fetch invoice metrics", 500);
        }
      },
    },
  },
});

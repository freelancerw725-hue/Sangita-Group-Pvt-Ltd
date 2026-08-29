import { createFileRoute } from "@tanstack/react-router";
import { fetchLeadFinderStats } from "@/lib/lead-finder-client";

export const Route = createFileRoute("/api/lead-finder-stats")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const stats = await fetchLeadFinderStats();
          if (!stats) {
            return new Response(JSON.stringify({ error: "Unable to fetch Lead Finder stats. Check LEAD_FINDER_BASE_URL." }), {
              status: 502,
              headers: { "content-type": "application/json" },
            });
          }
          // Never expose internal keys — only stats
          return new Response(JSON.stringify(stats), {
            headers: { "content-type": "application/json" },
          });
        } catch (e) {
          console.error("LEAD_FINDER_STATS_PROXY_ERROR", e);
          return new Response(JSON.stringify({ error: "Failed to fetch stats." }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});

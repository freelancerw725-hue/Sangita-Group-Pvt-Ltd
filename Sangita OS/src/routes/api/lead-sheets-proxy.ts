import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/lead-sheets-proxy")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const base = process.env.LEAD_FINDER_BASE_URL?.trim() || process.env.LEAD_FINDER_URL?.trim() || "https://sangita-lead-finder.vercel.app";
          const key = process.env.LEAD_FINDER_API_KEY?.trim() || process.env.LEAD_FINDER_AUTOMATION_KEY?.trim() || "";
          const headers: Record<string, string> = {};
          if (key) headers["x-api-key"] = key;
          const res = await fetch(`${base.replace(/\/$/, "")}/api/lead-sheets`, { headers, cache: "no-store" });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return new Response(JSON.stringify({ error: "Lead Finder unreachable", details: text.slice(0, 500) }), { status: 502, headers: { "content-type": "application/json" } });
          }
          const data = await res.json().catch(() => ({}));
          return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("LEAD_SHEETS_PROXY_ERROR", e);
          return new Response(JSON.stringify({ error: "Failed to fetch Lead Sheets" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});

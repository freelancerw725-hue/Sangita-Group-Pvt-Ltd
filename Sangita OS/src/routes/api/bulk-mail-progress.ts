import { createFileRoute } from "@tanstack/react-router";
import { fetchBulkMailProgress, fetchBulkMailCampaigns } from "@/lib/bulk-mail-client";

export const Route = createFileRoute("/api/bulk-mail-progress")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const idParam = url.searchParams.get("id") || url.searchParams.get("campaignId");
          if (idParam) {
            const id = Number(idParam);
            if (!Number.isFinite(id) || id <= 0) {
              return new Response(JSON.stringify({ error: "Invalid campaign id" }), { status: 400, headers: { "content-type": "application/json" } });
            }
            const progress = await fetchBulkMailProgress(id);
            if (!progress) {
              return new Response(JSON.stringify({ error: "Campaign not found or Bulk Mail unreachable" }), { status: 502, headers: { "content-type": "application/json" } });
            }
            return new Response(JSON.stringify(progress), { headers: { "content-type": "application/json" } });
          }
          // List mode: return campaigns list
          const list = await fetchBulkMailCampaigns();
          return new Response(JSON.stringify({ campaigns: list }), { headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("BULK_MAIL_PROGRESS_PROXY_ERROR", e);
          return new Response(JSON.stringify({ error: "Failed to fetch Bulk Mail progress" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({})) as { id?: number; campaignId?: number; action?: string };
          const id = Number(body.id ?? body.campaignId);
          const action = String(body.action || "").toLowerCase();
          if (!Number.isFinite(id) || id <= 0) {
            return new Response(JSON.stringify({ error: "Invalid campaign id" }), { status: 400, headers: { "content-type": "application/json" } });
          }
          if (!["pause", "resume", "cancel", "start"].includes(action)) {
            return new Response(JSON.stringify({ error: "Invalid action. Use pause|resume|cancel|start" }), { status: 400, headers: { "content-type": "application/json" } });
          }
          const { controlBulkMailCampaign } = await import("@/lib/bulk-mail-client");
          const ok = await controlBulkMailCampaign(id, action as any);
          if (!ok) {
            return new Response(JSON.stringify({ error: `Failed to ${action} campaign` }), { status: 502, headers: { "content-type": "application/json" } });
          }
          // Return fresh progress after control
          const { fetchBulkMailProgress } = await import("@/lib/bulk-mail-client");
          const progress = await fetchBulkMailProgress(id);
          return new Response(JSON.stringify({ success: true, action, progress }), { headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("BULK_MAIL_CONTROL_ERROR", e);
          return new Response(JSON.stringify({ error: "Failed to control campaign" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});

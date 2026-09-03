import { createFileRoute } from "@tanstack/react-router";
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getTemplates,
  createTemplate,
  getLeadBatches,
  createLeadBatch,
  getCampaignStats,
} from "@/lib/supabase/services/campaigns";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/campaigns")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
          const offset = Number(url.searchParams.get("offset") ?? 0);
          const status = url.searchParams.get("status") ?? undefined;
          const runStatus = url.searchParams.get("runStatus") ?? undefined;

          if (url.searchParams.get("stats") === "true") {
            const stats = await getCampaignStats();
            return json(stats);
          }

          const { data, count } = await getCampaigns({ limit, offset, status, runStatus });
          return json({ campaigns: data, total: count, limit, offset });
        } catch (e) {
          console.error("[campaigns GET]", e);
          return errorJson("Failed to fetch campaigns", 500);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body) return errorJson("Invalid JSON", 400);

          const campaign = await createCampaign(body);
          return json({ campaign }, { status: 201 });
        } catch (e) {
          console.error("[campaigns POST]", e);
          return errorJson("Failed to create campaign", 500);
        }
      },
    },
  },
});

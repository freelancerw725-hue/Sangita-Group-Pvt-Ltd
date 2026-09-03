import { createFileRoute } from "@tanstack/react-router";
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getTemplates,
  createTemplate,
  getLeadBatches,
  createLeadBatch,
} from "@/lib/supabase/services/campaigns";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/campaigns/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          const campaign = await getCampaignById(id);
          if (!campaign) return errorJson("Campaign not found", 404);
          return json({ campaign });
        } catch (e) {
          console.error("[campaigns/$id GET]", e);
          return errorJson("Failed to fetch campaign", 500);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const id = (params as { id: string }).id;
          const body = await request.json().catch(() => null);
          if (!body) return errorJson("Invalid JSON", 400);

          const campaign = await updateCampaign(id, body);
          return json({ campaign });
        } catch (e) {
          console.error("[campaigns/$id PATCH]", e);
          return errorJson("Failed to update campaign", 500);
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          await deleteCampaign(id);
          return json({ success: true });
        } catch (e) {
          console.error("[campaigns/$id DELETE]", e);
          return errorJson("Failed to delete campaign", 500);
        }
      },
    },
  },
});

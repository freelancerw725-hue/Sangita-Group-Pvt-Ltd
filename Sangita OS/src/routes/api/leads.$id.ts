import { createFileRoute } from "@tanstack/react-router";
import { getLeadById, updateLead, deleteLead } from "@/lib/supabase/services/leads";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/leads/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          const lead = await getLeadById(id);
          if (!lead) return errorJson("Lead not found", 404);
          return json({ lead });
        } catch (e) {
          console.error("[leads/$id GET]", e);
          return errorJson("Failed to fetch lead", 500);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const id = (params as { id: string }).id;
          const body = await request.json().catch(() => null);
          if (!body) return errorJson("Invalid JSON", 400);

          const lead = await updateLead(id, body);
          return json({ lead });
        } catch (e) {
          console.error("[leads/$id PATCH]", e);
          return errorJson("Failed to update lead", 500);
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          await deleteLead(id);
          return json({ success: true });
        } catch (e) {
          console.error("[leads/$id DELETE]", e);
          return errorJson("Failed to delete lead", 500);
        }
      },
    },
  },
});

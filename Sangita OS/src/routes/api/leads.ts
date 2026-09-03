import { createFileRoute } from "@tanstack/react-router";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadsStats,
  bulkUpsertLeads,
} from "@/lib/supabase/services/leads";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
          const offset = Number(url.searchParams.get("offset") ?? 0);
          const status = url.searchParams.get("status") ?? undefined;
          const verification = url.searchParams.get("verification") ?? undefined;
          const approval = url.searchParams.get("approval") ?? undefined;
          const search = url.searchParams.get("search") ?? undefined;

          const { data, count } = await getLeads({
            limit,
            offset,
            status,
            verification,
            approval,
            search,
          });
          return json({ leads: data, total: count, limit, offset });
        } catch (e) {
          console.error("[leads GET]", e);
          return errorJson("Failed to fetch leads", 500);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body) return errorJson("Invalid JSON", 400);

          if (Array.isArray(body)) {
            const result = await bulkUpsertLeads(body);
            return json(result, { status: 201 });
          }

          const lead = await createLead(body);
          return json({ lead }, { status: 201 });
        } catch (e) {
          console.error("[leads POST]", e);
          return errorJson("Failed to create lead", 500);
        }
      },
    },
  },
});

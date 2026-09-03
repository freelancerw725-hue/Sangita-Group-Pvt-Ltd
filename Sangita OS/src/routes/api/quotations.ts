import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/quotations")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("quotations")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ quotations: data || [] });
        } catch (e) {
          console.error("[api/quotations] Error:", e);
          return errorJson("Failed to fetch quotations", 500);
        }
      },
    },
  },
});

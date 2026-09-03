import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/whatsapp-templates")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("whatsapp_templates")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ templates: data || [] });
        } catch (e) {
          console.error("[api/whatsapp-templates] Error:", e);
          return errorJson("Failed to fetch WhatsApp templates", 500);
        }
      },
    },
  },
});

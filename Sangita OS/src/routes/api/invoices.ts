import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/invoices")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("invoices")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ invoices: data || [] });
        } catch (e) {
          console.error("[api/invoices] Error:", e);
          return errorJson("Failed to fetch invoices", 500);
        }
      },
    },
  },
});

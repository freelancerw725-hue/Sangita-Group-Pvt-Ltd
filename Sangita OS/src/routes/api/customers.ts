import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/customers")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("sangita_customers")
            .select("*")
            .order("ltv", { ascending: false });
          if (error) throw error;
          return json({ customers: data || [] });
        } catch (e) {
          console.error("[api/customers] Error:", e);
          return errorJson("Failed to fetch customers", 500);
        }
      },
    },
  },
});

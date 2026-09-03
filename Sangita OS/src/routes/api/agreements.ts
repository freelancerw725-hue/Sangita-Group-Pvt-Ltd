import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/agreements")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("agreements")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ agreements: data || [] });
        } catch (e) {
          console.error("[api/agreements] Error:", e);
          return errorJson("Failed to fetch agreements", 500);
        }
      },
    },
  },
});

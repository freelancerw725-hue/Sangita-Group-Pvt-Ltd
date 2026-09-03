import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/habits")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("habits")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ habits: data || [] });
        } catch (e) {
          console.error("[api/habits] Error:", e);
          return errorJson("Failed to fetch habits", 500);
        }
      },
    },
  },
});

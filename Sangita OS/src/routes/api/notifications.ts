import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/notifications")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ notifications: data || [] });
        } catch (e) {
          console.error("[api/notifications] Error:", e);
          return errorJson("Failed to fetch notifications", 500);
        }
      },
    },
  },
});

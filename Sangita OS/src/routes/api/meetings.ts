import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/meetings")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("meetings")
            .select("*")
            .order("at", { ascending: false });
          if (error) throw error;
          return json({ meetings: data || [] });
        } catch (e) {
          console.error("[api/meetings] Error:", e);
          return errorJson("Failed to fetch meetings", 500);
        }
      },
    },
  },
});

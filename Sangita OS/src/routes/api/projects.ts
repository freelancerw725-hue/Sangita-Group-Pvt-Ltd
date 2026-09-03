import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/projects")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ projects: data || [] });
        } catch (e) {
          console.error("[api/projects] Error:", e);
          return errorJson("Failed to fetch projects", 500);
        }
      },
    },
  },
});

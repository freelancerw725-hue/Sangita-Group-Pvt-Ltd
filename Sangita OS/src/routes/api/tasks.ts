import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/tasks")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("tasks")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ tasks: data || [] });
        } catch (e) {
          console.error("[api/tasks] Error:", e);
          return errorJson("Failed to fetch tasks", 500);
        }
      },
    },
  },
});

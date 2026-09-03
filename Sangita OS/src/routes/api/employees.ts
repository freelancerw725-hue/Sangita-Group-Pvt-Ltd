import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/employees")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("employees")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ employees: data || [] });
        } catch (e) {
          console.error("[api/employees] Error:", e);
          return errorJson("Failed to fetch employees", 500);
        }
      },
    },
  },
});

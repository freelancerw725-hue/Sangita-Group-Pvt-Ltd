import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/calls")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("calls")
            .select("*")
            .order("at", { ascending: false });
          if (error) throw error;
          return json({ calls: data || [] });
        } catch (e) {
          console.error("[api/calls] Error:", e);
          return errorJson("Failed to fetch calls", 500);
        }
      },
    },
  },
});

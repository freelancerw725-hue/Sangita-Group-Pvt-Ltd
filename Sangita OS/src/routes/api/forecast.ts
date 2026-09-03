import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/forecast")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("forecast_12m")
            .select("*")
            .order("month", { ascending: true });
          if (error) throw error;
          return json({ forecast: data || [] });
        } catch (e) {
          console.error("[api/forecast] Error:", e);
          return errorJson("Failed to fetch forecast", 500);
        }
      },
    },
  },
});

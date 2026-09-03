import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/products")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdmin();
          const { data, error } = await admin
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return json({ products: data || [] });
        } catch (e) {
          console.error("[api/products] Error:", e);
          return errorJson("Failed to fetch products", 500);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { getCustomerById, updateCustomer, deleteCustomer } from "@/lib/supabase/services/customers";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/customers/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          const customer = await getCustomerById(id);
          if (!customer) return errorJson("Customer not found", 404);
          return json({ customer });
        } catch (e) {
          console.error("[customers/$id GET]", e);
          return errorJson("Failed to fetch customer", 500);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const id = (params as { id: string }).id;
          const body = await request.json().catch(() => null);
          if (!body) return errorJson("Invalid JSON", 400);

          const customer = await updateCustomer(id, body);
          return json({ customer });
        } catch (e) {
          console.error("[customers/$id PATCH]", e);
          return errorJson("Failed to update customer", 500);
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          await deleteCustomer(id);
          return json({ success: true });
        } catch (e) {
          console.error("[customers/$id DELETE]", e);
          return errorJson("Failed to delete customer", 500);
        }
      },
    },
  },
});

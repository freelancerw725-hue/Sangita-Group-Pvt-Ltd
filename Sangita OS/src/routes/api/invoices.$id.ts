import { createFileRoute } from "@tanstack/react-router";
import { getInvoiceById, updateInvoice, deleteInvoice } from "@/lib/supabase/services/invoices";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/invoices/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          const invoice = await getInvoiceById(id);
          if (!invoice) return errorJson("Invoice not found", 404);
          return json({ invoice });
        } catch (e) {
          console.error("[invoices/$id GET]", e);
          return errorJson("Failed to fetch invoice", 500);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const id = (params as { id: string }).id;
          const body = await request.json().catch(() => null);
          if (!body) return errorJson("Invalid JSON", 400);

          const invoice = await updateInvoice(id, body);
          return json({ invoice });
        } catch (e) {
          console.error("[invoices/$id PATCH]", e);
          return errorJson("Failed to update invoice", 500);
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          await deleteInvoice(id);
          return json({ success: true });
        } catch (e) {
          console.error("[invoices/$id DELETE]", e);
          return errorJson("Failed to delete invoice", 500);
        }
      },
    },
  },
});

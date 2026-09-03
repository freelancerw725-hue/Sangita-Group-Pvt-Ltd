import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type InvoiceInsert = TablesInsert<"invoices">;
type InvoiceUpdate = TablesUpdate<"invoices">;

export async function getInvoices(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  client?: string;
}): Promise<{ data: Invoice[]; count: number }> {
  const supabase = await supabaseAdmin;
  let query = supabase.from("invoices").select("*", { count: "exact" });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.client) {
    query = query.ilike("client", `%${options.client}%`);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1);
  }

  query = query.order("issue_date", { ascending: false });

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Invoice[]) ?? [], count: count ?? 0 };
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Invoice | null;
}

export async function createInvoice(input: InvoiceInsert): Promise<Invoice> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("invoices").insert(input).select().single();
  if (error) throw error;
  return data as Invoice;
}

export async function updateInvoice(id: string, patch: InvoiceUpdate): Promise<Invoice> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("invoices")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Invoice;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const supabase = await supabaseAdmin;
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function getInvoicesStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
}> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("invoices").select("status, items");
  if (error) throw error;

  const byStatus: Record<string, number> = {};
  let totalAmount = 0;
  let paidAmount = 0;
  let overdueAmount = 0;

  for (const inv of (data as Invoice[]) ?? []) {
    byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
    const items = (inv.items as { qty: number; rate: number; gstPct: number }[]) ?? [];
    const subtotal = items.reduce((s, it) => s + it.qty * it.rate, 0);
    const gst = items.reduce((s, it) => s + (it.qty * it.rate * it.gstPct) / 100, 0);
    const total = subtotal + gst;
    totalAmount += total;
    if (inv.status === "Paid") paidAmount += total;
    if (inv.status === "Overdue") overdueAmount += total;
  }

  return { total: data?.length ?? 0, byStatus, totalAmount, paidAmount, overdueAmount };
}

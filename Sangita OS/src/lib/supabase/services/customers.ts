import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Customer = Tables<"sangita_customers">;
type CustomerInsert = TablesInsert<"sangita_customers">;
type CustomerUpdate = TablesUpdate<"sangita_customers">;

export async function getCustomers(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ data: Customer[]; count: number }> {
  const supabase = await supabaseAdmin;
  let query = supabase.from("sangita_customers").select("*", { count: "exact" });

  if (options?.search) {
    const term = `%${options.search}%`;
    query = query.or(`name.ilike.${term},company.ilike.${term},email.ilike.${term}`);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Customer[]) ?? [], count: count ?? 0 };
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("sangita_customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}

export async function createCustomer(input: CustomerInsert): Promise<Customer> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("sangita_customers").insert(input).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: string, patch: CustomerUpdate): Promise<Customer> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("sangita_customers")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const supabase = await supabaseAdmin;
  const { error } = await supabase.from("sangita_customers").delete().eq("id", id);
  if (error) throw error;
  return true;
}

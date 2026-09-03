import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;
type LeadInsert = TablesInsert<"leads">;
type LeadUpdate = TablesUpdate<"leads">;

export async function getLeads(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  verification?: string;
  approval?: string;
  search?: string;
}): Promise<{ data: Lead[]; count: number }> {
  const supabase = await supabaseAdmin;
  let query = supabase.from("leads").select("*", { count: "exact" });

  if (options?.status) {
    query = query.eq("lead_status", options.status);
  }
  if (options?.verification) {
    query = query.eq("verification_status", options.verification);
  }
  if (options?.approval) {
    query = query.eq("approval_status", options.approval);
  }
  if (options?.search) {
    const term = `%${options.search}%`;
    query = query.or(`company.ilike.${term},contact.ilike.${term},email.ilike.${term}`);
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
  return { data: (data as Lead[]) ?? [], count: count ?? 0 };
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Lead | null;
}

export async function getLeadByEmail(email: string): Promise<Lead | null> {
  const supabase = await supabaseAdmin;
  const normalized = email.toLowerCase().trim();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("normalized_email", normalized)
    .maybeSingle();
  if (error) throw error;
  return data as Lead | null;
}

export async function createLead(input: LeadInsert): Promise<Lead> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("leads").insert(input).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function upsertLead(input: LeadInsert): Promise<Lead> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("leads")
    .upsert(input, { onConflict: "normalized_email" })
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLead(id: string, patch: LeadUpdate): Promise<Lead> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("leads")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function deleteLead(id: string): Promise<boolean> {
  const supabase = await supabaseAdmin;
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function getLeadsStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byVerification: Record<string, number>;
  byApproval: Record<string, number>;
  todayCount: number;
}> {
  const supabase = await supabaseAdmin;
  const today = new Date().toISOString().split("T")[0];

  const [{ data: allLeads, error: e1 }, { count: todayCount, error: e2 }] = await Promise.all([
    supabase.from("leads").select("lead_status, verification_status, approval_status"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("added_date", `${today}T00:00:00Z`)
      .lt("added_date", `${today}T23:59:59Z`),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const byStatus: Record<string, number> = {};
  const byVerification: Record<string, number> = {};
  const byApproval: Record<string, number> = {};

  for (const lead of (allLeads as Lead[]) ?? []) {
    byStatus[lead.lead_status] = (byStatus[lead.lead_status] || 0) + 1;
    byVerification[lead.verification_status] = (byVerification[lead.verification_status] || 0) + 1;
    byApproval[lead.approval_status] = (byApproval[lead.approval_status] || 0) + 1;
  }

  return {
    total: allLeads?.length ?? 0,
    byStatus,
    byVerification,
    byApproval,
    todayCount: todayCount ?? 0,
  };
}

export async function bulkUpsertLeads(
  leads: LeadInsert[],
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  const supabase = await supabaseAdmin;
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;

  const batchSize = 100;
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("leads")
      .upsert(batch, { onConflict: "normalized_email" })
      .select("id");

    if (error) {
      errors.push(error.message);
      continue;
    }

    for (const lead of batch) {
      const existing = await getLeadByEmail(lead.email);
      if (existing) updated++;
      else inserted++;
    }
  }

  return { inserted, updated, errors };
}

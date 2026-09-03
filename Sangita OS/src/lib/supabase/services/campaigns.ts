import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type CampaignInsert = TablesInsert<"campaigns">;
type CampaignUpdate = TablesUpdate<"campaigns">;

type Template = Tables<"templates">;
type LeadBatch = Tables<"lead_batches">;

export async function getCampaigns(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  runStatus?: string;
}): Promise<{ data: Campaign[]; count: number }> {
  const supabase = await supabaseAdmin;
  let query = supabase
    .from("campaigns")
    .select("*, templates(name,category), lead_batches(name)", { count: "exact" });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.runStatus) {
    query = query.eq("run_status", options.runStatus);
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
  return { data: (data as Campaign[]) ?? [], count: count ?? 0 };
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, templates(*), lead_batches(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Campaign | null;
}

export async function createCampaign(input: CampaignInsert): Promise<Campaign> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("campaigns").insert(input).select().single();
  if (error) throw error;
  return data as Campaign;
}

export async function updateCampaign(id: string, patch: CampaignUpdate): Promise<Campaign> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("campaigns")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Campaign;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const supabase = await supabaseAdmin;
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function getTemplates(): Promise<Template[]> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("category")
    .order("name");
  if (error) throw error;
  return (data as Template[]) ?? [];
}

export async function createTemplate(input: TablesInsert<"templates">): Promise<Template> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("templates").insert(input).select().single();
  if (error) throw error;
  return data as Template;
}

export async function getLeadBatches(): Promise<LeadBatch[]> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("lead_batches")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LeadBatch[]) ?? [];
}

export async function createLeadBatch(input: TablesInsert<"lead_batches">): Promise<LeadBatch> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("lead_batches").insert(input).select().single();
  if (error) throw error;
  return data as LeadBatch;
}

export async function getCampaignStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byRunStatus: Record<string, number>;
}> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("campaigns").select("status, run_status");
  if (error) throw error;

  const byStatus: Record<string, number> = {};
  const byRunStatus: Record<string, number> = {};

  for (const c of (data as Campaign[]) ?? []) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byRunStatus[c.run_status] = (byRunStatus[c.run_status] || 0) + 1;
  }

  return { total: data?.length ?? 0, byStatus, byRunStatus };
}

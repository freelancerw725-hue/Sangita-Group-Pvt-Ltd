import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type ProjectInsert = TablesInsert<"projects">;
type ProjectUpdate = TablesUpdate<"projects">;

export async function getProjects(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  owner?: string;
}): Promise<{ data: Project[]; count: number }> {
  const supabase = await supabaseAdmin;
  let query = supabase.from("projects").select("*", { count: "exact" });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.owner) {
    query = query.eq("owner", options.owner);
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
  return { data: (data as Project[]) ?? [], count: count ?? 0 };
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Project | null;
}

export async function createProject(input: ProjectInsert): Promise<Project> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("projects").insert(input).select().single();
  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, patch: ProjectUpdate): Promise<Project> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("projects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string): Promise<boolean> {
  const supabase = await supabaseAdmin;
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function getProjectsStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalBudget: number;
  totalSpent: number;
}> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("projects").select("status, budget, spent");
  if (error) throw error;

  const byStatus: Record<string, number> = {};
  let totalBudget = 0;
  let totalSpent = 0;

  for (const p of (data as Project[]) ?? []) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    totalBudget += p.budget || 0;
    totalSpent += p.spent || 0;
  }

  return { total: data?.length ?? 0, byStatus, totalBudget, totalSpent };
}

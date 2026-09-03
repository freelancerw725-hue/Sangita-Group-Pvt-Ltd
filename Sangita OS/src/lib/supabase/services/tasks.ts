import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type TaskInsert = TablesInsert<"tasks">;
type TaskUpdate = TablesUpdate<"tasks">;

export async function getTasks(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  priority?: string;
  owner?: string;
  project?: string;
}): Promise<{ data: Task[]; count: number }> {
  const supabase = await supabaseAdmin;
  let query = supabase.from("tasks").select("*", { count: "exact" });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.priority) {
    query = query.eq("priority", options.priority);
  }
  if (options?.owner) {
    query = query.eq("owner", options.owner);
  }
  if (options?.project) {
    query = query.eq("project", options.project);
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
  return { data: (data as Task[]) ?? [], count: count ?? 0 };
}

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Task | null;
}

export async function createTask(input: TaskInsert): Promise<Task> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("tasks").insert(input).select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: TaskUpdate): Promise<Task> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<boolean> {
  const supabase = await supabaseAdmin;
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function getTasksStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
}> {
  const supabase = await supabaseAdmin;
  const { data, error } = await supabase.from("tasks").select("status, priority, due_date");
  if (error) throw error;

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let overdue = 0;
  const now = new Date();

  for (const t of (data as Task[]) ?? []) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    if (t.due_date && new Date(t.due_date) < now && t.status !== "done") {
      overdue++;
    }
  }

  return { total: data?.length ?? 0, byStatus, byPriority, overdue };
}

/**
 * Persistence layer for Keyword Pool.
 * - Supabase store (production)
 * - InMemory store (tests & fallback when env missing)
 * Both implement KeywordStore interface so service & API routes stay storage-agnostic.
 */
import type { Keyword, KeywordStatus, KeywordUsage, UsageEventType } from "./types";
import { normalizeKeyword } from "./normalize";

// Supabase row helpers (snake_case ↔ camelCase)
type KeywordRow = {
  id: string;
  keyword: string;
  normalized_keyword: string;
  source: "ai" | "manual";
  status: "active" | "paused" | "completed";
  daily_target: number;
  priority: number;
  created_at: string;
  last_used_at: string | null;
  total_searches: number;
  total_leads_found: number;
  total_new_leads: number;
  total_duplicates: number;
  notes: string | null;
};

type UsageRow = {
  id: string;
  keyword_id: string;
  keyword: string;
  event_type: UsageEventType;
  leads_found: number;
  new_leads: number;
  duplicates: number;
  error_message: string | null;
  created_at: string;
};

function rowToKeyword(r: KeywordRow): Keyword {
  return {
    id: r.id,
    keyword: r.keyword,
    normalizedKeyword: r.normalized_keyword,
    source: r.source,
    status: r.status,
    dailyTarget: r.daily_target,
    priority: r.priority,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    totalSearches: r.total_searches,
    totalLeadsFound: r.total_leads_found,
    totalNewLeads: r.total_new_leads,
    totalDuplicates: r.total_duplicates,
    notes: r.notes,
  };
}

function keywordToRow(k: Partial<Keyword> & { keyword?: string }): Partial<KeywordRow> {
  const row: Partial<KeywordRow> = {};
  if (k.keyword !== undefined) {
    row.keyword = k.keyword;
    row.normalized_keyword = normalizeKeyword(k.keyword);
  }
  if (k.normalizedKeyword !== undefined) row.normalized_keyword = k.normalizedKeyword;
  if (k.source !== undefined) row.source = k.source as KeywordRow["source"];
  if (k.status !== undefined) row.status = k.status as KeywordRow["status"];
  if (k.dailyTarget !== undefined) row.daily_target = k.dailyTarget;
  if (k.priority !== undefined) row.priority = k.priority;
  if (k.lastUsedAt !== undefined) row.last_used_at = k.lastUsedAt;
  if (k.totalSearches !== undefined) row.total_searches = k.totalSearches;
  if (k.totalLeadsFound !== undefined) row.total_leads_found = k.totalLeadsFound;
  if (k.totalNewLeads !== undefined) row.total_new_leads = k.totalNewLeads;
  if (k.totalDuplicates !== undefined) row.total_duplicates = k.totalDuplicates;
  if (k.notes !== undefined) row.notes = k.notes;
  return row;
}

function rowToUsage(r: UsageRow): KeywordUsage {
  return {
    id: r.id,
    keywordId: r.keyword_id,
    keyword: r.keyword,
    eventType: r.event_type,
    leadsFound: r.leads_found,
    newLeads: r.new_leads,
    duplicates: r.duplicates,
    errorMessage: r.error_message,
    createdAt: r.created_at,
  };
}

export interface KeywordStore {
  list(): Promise<Keyword[]>;
  getById(id: string): Promise<Keyword | null>;
  findByNormalized(normalized: string): Promise<Keyword | null>;
  insert(keyword: Keyword): Promise<Keyword>;
  update(id: string, patch: Partial<Keyword>): Promise<Keyword>;
  delete(id: string): Promise<void>;
  // usage
  insertUsage(usage: KeywordUsage): Promise<KeywordUsage>;
  countTodaySearches(keywordId: string, day?: Date): Promise<number>;
  listUsage(keywordId: string, limit?: number): Promise<KeywordUsage[]>;
  // for next-keyword: bulk today counts
  getTodayCounts(day?: Date): Promise<Map<string, number>>;
}

// ── Supabase implementation ──

export class SupabaseKeywordStore implements KeywordStore {
  // lazy import to avoid bundling server client in browser
  private async getAdmin() {
    const mod = await import("@/integrations/supabase/client.server");
    return mod.supabaseAdmin;
  }

  async list(): Promise<Keyword[]> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("keyword_pool")
      .select("*")
      .order("priority", { ascending: true })
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ((data as KeywordRow[]) ?? []).map(rowToKeyword);
  }

  async getById(id: string): Promise<Keyword | null> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("keyword_pool")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToKeyword(data as KeywordRow) : null;
  }

  async findByNormalized(normalized: string): Promise<Keyword | null> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("keyword_pool")
      .select("*")
      .eq("normalized_keyword", normalized)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToKeyword(data as KeywordRow) : null;
  }

  async insert(keyword: Keyword): Promise<Keyword> {
    const supabaseAdmin = await this.getAdmin();
    const row: KeywordRow = {
      id: keyword.id,
      keyword: keyword.keyword,
      normalized_keyword: keyword.normalizedKeyword,
      source: keyword.source,
      status: keyword.status,
      daily_target: keyword.dailyTarget,
      priority: keyword.priority,
      created_at: keyword.createdAt,
      last_used_at: keyword.lastUsedAt,
      total_searches: keyword.totalSearches,
      total_leads_found: keyword.totalLeadsFound,
      total_new_leads: keyword.totalNewLeads,
      total_duplicates: keyword.totalDuplicates,
      notes: keyword.notes,
    };
    const { data, error } = await supabaseAdmin
      .from("keyword_pool")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return rowToKeyword(data as KeywordRow);
  }

  async update(id: string, patch: Partial<Keyword>): Promise<Keyword> {
    const supabaseAdmin = await this.getAdmin();
    const rowPatch = keywordToRow(patch);
    const { data, error } = await supabaseAdmin
      .from("keyword_pool")
      .update(rowPatch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToKeyword(data as KeywordRow);
  }

  async delete(id: string): Promise<void> {
    const supabaseAdmin = await this.getAdmin();
    const { error } = await supabaseAdmin.from("keyword_pool").delete().eq("id", id);
    if (error) throw error;
  }

  async insertUsage(usage: KeywordUsage): Promise<KeywordUsage> {
    const supabaseAdmin = await this.getAdmin();
    const row: UsageRow = {
      id: usage.id,
      keyword_id: usage.keywordId,
      keyword: usage.keyword,
      event_type: usage.eventType,
      leads_found: usage.leadsFound,
      new_leads: usage.newLeads,
      duplicates: usage.duplicates,
      error_message: usage.errorMessage,
      created_at: usage.createdAt,
    };
    const { data, error } = await supabaseAdmin
      .from("keyword_usage_log")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return rowToUsage(data as UsageRow);
  }

  async countTodaySearches(keywordId: string, day: Date = new Date()): Promise<number> {
    const supabaseAdmin = await this.getAdmin();
    const start = new Date(day);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const { count, error } = await supabaseAdmin
      .from("keyword_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("keyword_id", keywordId)
      .in("event_type", ["search_started", "search_completed"])
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
    if (error) throw error;
    return count ?? 0;
  }

  async listUsage(keywordId: string, limit = 50): Promise<KeywordUsage[]> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("keyword_usage_log")
      .select("*")
      .eq("keyword_id", keywordId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data as UsageRow[]) ?? []).map(rowToUsage);
  }

  async getTodayCounts(day: Date = new Date()): Promise<Map<string, number>> {
    const supabaseAdmin = await this.getAdmin();
    const start = new Date(day);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const { data, error } = await supabaseAdmin
      .from("keyword_usage_log")
      .select("keyword_id")
      .in("event_type", ["search_started", "search_completed"])
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const r of (data as { keyword_id: string }[]) ?? []) {
      counts.set(r.keyword_id, (counts.get(r.keyword_id) ?? 0) + 1);
    }
    return counts;
  }
}

// ── InMemory implementation (tests, dev fallback) ──

export class InMemoryKeywordStore implements KeywordStore {
  keywords: Map<string, Keyword> = new Map();
  usages: KeywordUsage[] = [];

  async list(): Promise<Keyword[]> {
    return Array.from(this.keywords.values()).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const aLast = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bLast = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      if (aLast !== bLast) return aLast - bLast;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }
  async getById(id: string): Promise<Keyword | null> {
    return this.keywords.get(id) ?? null;
  }
  async findByNormalized(normalized: string): Promise<Keyword | null> {
    for (const k of this.keywords.values()) if (k.normalizedKeyword === normalized) return k;
    return null;
  }
  async insert(keyword: Keyword): Promise<Keyword> {
    this.keywords.set(keyword.id, { ...keyword });
    return { ...keyword };
  }
  async update(id: string, patch: Partial<Keyword>): Promise<Keyword> {
    const existing = this.keywords.get(id);
    if (!existing) throw new Error("NOT_FOUND");
    const next = { ...existing, ...patch };
    // keep normalized in sync if keyword changed
    if (patch.keyword !== undefined) {
      next.normalizedKeyword = normalizeKeyword(patch.keyword);
    }
    this.keywords.set(id, next);
    return { ...next };
  }
  async delete(id: string): Promise<void> {
    this.keywords.delete(id);
    this.usages = this.usages.filter((u) => u.keywordId !== id);
  }
  async insertUsage(usage: KeywordUsage): Promise<KeywordUsage> {
    this.usages.push({ ...usage });
    return { ...usage };
  }
  private dayRange(day: Date) {
    const start = new Date(day);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }
  async countTodaySearches(keywordId: string, day: Date = new Date()): Promise<number> {
    const { start, end } = this.dayRange(day);
    return this.usages.filter(
      (u) =>
        u.keywordId === keywordId &&
        (u.eventType === "search_started" || u.eventType === "search_completed") &&
        new Date(u.createdAt) >= start &&
        new Date(u.createdAt) < end,
    ).length;
  }
  async listUsage(keywordId: string, limit = 50): Promise<KeywordUsage[]> {
    return this.usages
      .filter((u) => u.keywordId === keywordId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  async getTodayCounts(day: Date = new Date()): Promise<Map<string, number>> {
    const { start, end } = this.dayRange(day);
    const counts = new Map<string, number>();
    for (const u of this.usages) {
      if (
        (u.eventType === "search_started" || u.eventType === "search_completed") &&
        new Date(u.createdAt) >= start &&
        new Date(u.createdAt) < end
      ) {
        counts.set(u.keywordId, (counts.get(u.keywordId) ?? 0) + 1);
      }
    }
    return counts;
  }
  // test helper
  clear() {
    this.keywords.clear();
    this.usages = [];
  }
  async seed(keywords: Keyword[]) {
    for (const k of keywords) await this.insert(k);
  }
}

// Singleton for server runtime (lazy)
let _supabaseStore: SupabaseKeywordStore | null = null;
let _memoryFallback: InMemoryKeywordStore | null = null;

function hasSupabaseEnv(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getKeywordStore(): KeywordStore {
  // In test (vitest) always use memory — detected via NODE_ENV or VITEST
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    if (!_memoryFallback) _memoryFallback = new InMemoryKeywordStore();
    return _memoryFallback;
  }
  if (hasSupabaseEnv()) {
    if (!_supabaseStore) _supabaseStore = new SupabaseKeywordStore();
    return _supabaseStore;
  }
  // Dev fallback when env not configured
  if (!_memoryFallback) _memoryFallback = new InMemoryKeywordStore();
  return _memoryFallback;
}

// For tests to acquire a fresh isolated store
export function createIsolatedMemoryStore(): InMemoryKeywordStore {
  return new InMemoryKeywordStore();
}

/**
 * Persistence layer for Keyword Intelligence Engine.
 * Supabase implementation with InMemory fallback for tests.
 */

import type {
  RegionConfig,
  KeywordTemplate,
  IntelligenceConfig,
  KeywordPerformance,
  DailyRunConfigSnapshot,
  SelectedKeyword,
  DailyRunResult,
} from "./service";

// ============================================================
// ROW TYPES (snake_case from DB)
// ============================================================

type RegionRow = {
  id: string;
  region_code: string;
  region_name: string;
  display_order: number;
  keyword_templates: string[];
  business_categories: string[];
  city_modifiers: string[];
  language_modifiers: string[];
  max_keywords_per_day: number;
  min_keywords_per_day: number;
  performance_weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  region_code: string | null;
  base_patterns: string[];
  category_modifiers: string[];
  city_modifiers: string[];
  language_modifiers: string[];
  suffixes: string[];
  max_combinations_per_run: number;
  priority: number;
  source_tag: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type PerformanceRow = {
  id: string;
  keyword_id: string;
  keyword: string;
  normalized_keyword: string;
  region_code: string | null;
  window_start: string;
  window_end: string;
  total_searches: number;
  total_leads_found: number;
  total_new_leads: number;
  total_duplicates: number;
  total_verified_valid: number;
  total_approved: number;
  total_contacted: number;
  total_replied: number;
  total_interested: number;
  total_customers: number;
  lead_rate: number | null;
  new_lead_rate: number | null;
  verification_rate: number | null;
  approval_rate: number | null;
  reply_rate: number | null;
  conversion_rate: number | null;
  performance_score: number;
  region_rank: number | null;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
};

type DailyRunRow = {
  id: string;
  run_date: string;
  region_code: string;
  region_name: string;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  config_snapshot: DailyRunConfigSnapshot;
  selected_keywords: SelectedKeyword[];
  total_keywords_selected: number;
  total_searches_initiated: number;
  total_searches_completed: number;
  total_leads_found: number;
  total_new_leads: number;
  total_duplicates: number;
  lead_finder_job_ids: string[];
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
};

type DailySelectionRow = {
  id: string;
  run_id: string;
  keyword_id: string;
  keyword: string;
  normalized_keyword: string;
  source: "ai" | "manual" | "generated";
  priority: number;
  daily_target: number;
  selection_reason: string;
  performance_score: number | null;
  region_rank: number | null;
  search_initiated: boolean;
  search_completed: boolean;
  leads_found: number;
  new_leads: number;
  duplicates: number;
  lead_finder_job_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type ConfigRow = {
  id: string;
  config_key: string;
  config_value: unknown;
  description: string | null;
  is_editable: boolean;
  created_at: string;
  updated_at: string;
};

// ============================================================
// STORE INTERFACE
// ============================================================

export interface KeywordIntelligenceStore {
  // Regions
  listRegions(): Promise<RegionConfig[]>;
  getRegion(regionCode: string): Promise<RegionConfig | null>;
  upsertRegion(region: RegionConfig): Promise<RegionConfig>;
  setRegionActive(regionCode: string, active: boolean): Promise<void>;
  updateRegionOrder(regionCode: string, displayOrder: number): Promise<void>;

  // Templates
  listTemplates(regionCode?: string): Promise<KeywordTemplate[]>;
  getTemplate(id: string): Promise<KeywordTemplate | null>;
  upsertTemplate(template: KeywordTemplate): Promise<KeywordTemplate>;
  deleteTemplate(id: string): Promise<void>;

  // Performance
  getKeywordPerformance(regionCode: string, windowDays: number): Promise<KeywordPerformance[]>;
  upsertKeywordPerformance(perf: KeywordPerformance): Promise<KeywordPerformance>;
  recalculateAllPerformance(windowDays: number): Promise<number>;

  // Daily Runs
  createDailyRun(run: DailyRunResult): Promise<DailyRunResult>;
  getDailyRun(runId: string): Promise<DailyRunResult | null>;
  getDailyRunByDate(date: string): Promise<DailyRunResult | null>;
  updateDailyRun(runId: string, patch: Partial<DailyRunResult>): Promise<DailyRunResult>;
  listDailyRuns(limit?: number, offset?: number): Promise<DailyRunResult[]>;

  // Daily Selections
  insertDailySelections(selections: SelectedKeyword[], runId: string): Promise<void>;
  getDailySelections(runId: string): Promise<SelectedKeyword[]>;
  updateDailySelection(selectionId: string, patch: Partial<SelectedKeyword>): Promise<void>;

  // Config
  getConfig(): Promise<IntelligenceConfig>;
  setConfig(key: string, value: unknown): Promise<void>;
  bulkSetConfig(configs: Array<{ key: string; value: unknown }>): Promise<void>;

  // Recent keywords for duplicate avoidance
  getRecentKeywordNorms(days: number, regionCode?: string): Promise<Set<string>>;

  // Lead Finder job tracking
  addLeadFinderJobIds(runId: string, jobIds: string[]): Promise<void>;
}

// ============================================================
// ROW TRANSFORMERS
// ============================================================

function rowToRegion(r: RegionRow): RegionConfig {
  return {
    regionCode: r.region_code,
    regionName: r.region_name,
    displayOrder: r.display_order,
    keywordTemplates: r.keyword_templates,
    businessCategories: r.business_categories,
    cityModifiers: r.city_modifiers,
    languageModifiers: r.language_modifiers,
    maxKeywordsPerDay: r.max_keywords_per_day,
    minKeywordsPerDay: r.min_keywords_per_day,
    performanceWeight: r.performance_weight,
    isActive: r.is_active,
  };
}

function rowToTemplate(r: TemplateRow): KeywordTemplate {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    regionCode: r.region_code,
    basePatterns: r.base_patterns,
    categoryModifiers: r.category_modifiers,
    cityModifiers: r.city_modifiers,
    languageModifiers: r.language_modifiers,
    suffixes: r.suffixes,
    maxCombinationsPerRun: r.max_combinations_per_run,
    priority: r.priority,
    sourceTag: r.source_tag,
    isActive: r.is_active,
  };
}

function rowToPerformance(r: PerformanceRow): KeywordPerformance {
  return {
    keywordId: r.keyword_id,
    keyword: r.keyword,
    normalizedKeyword: r.normalized_keyword,
    totalSearches: r.total_searches,
    totalLeadsFound: r.total_leads_found,
    totalNewLeads: r.total_new_leads,
    leadRate: r.lead_rate ?? 0,
    newLeadRate: r.new_lead_rate ?? 0,
    performanceScore: r.performance_score,
    regionRank: r.region_rank ?? 0,
  };
}

function rowToDailyRun(r: DailyRunRow): DailyRunResult {
  return {
    runId: r.id,
    runDate: r.run_date,
    regionCode: r.region_code,
    regionName: r.region_name,
    status: r.status,
    selectedKeywords: r.selected_keywords,
    totalKeywordsSelected: r.total_keywords_selected,
    configSnapshot: r.config_snapshot,
  };
}

function rowToSelection(r: DailySelectionRow): SelectedKeyword {
  return {
    keywordId: r.keyword_id,
    keyword: r.keyword,
    normalizedKeyword: r.normalized_keyword,
    source: r.source,
    priority: r.priority,
    dailyTarget: r.daily_target,
    selectionReason: r.selection_reason,
    performanceScore: r.performance_score,
    regionRank: r.region_rank,
    templateId: null, // Not stored in selections table
  };
}

// ============================================================
// SUPABASE IMPLEMENTATION
// ============================================================

export class SupabaseKeywordIntelligenceStore implements KeywordIntelligenceStore {
  private async getAdmin() {
    const mod = await import("@/integrations/supabase/client.server");
    return mod.supabaseAdmin;
  }

  // ---- Regions ----

  async listRegions(): Promise<RegionConfig[]> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("region_rotation")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) throw error;
    return ((data as RegionRow[]) ?? []).map(rowToRegion);
  }

  async getRegion(regionCode: string): Promise<RegionConfig | null> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("region_rotation")
      .select("*")
      .eq("region_code", regionCode)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToRegion(data as RegionRow) : null;
  }

  async upsertRegion(region: RegionConfig): Promise<RegionConfig> {
    const supabaseAdmin = await this.getAdmin();
    const row = {
      region_code: region.regionCode,
      region_name: region.regionName,
      display_order: region.displayOrder,
      keyword_templates: region.keywordTemplates,
      business_categories: region.businessCategories,
      city_modifiers: region.cityModifiers,
      language_modifiers: region.languageModifiers,
      max_keywords_per_day: region.maxKeywordsPerDay,
      min_keywords_per_day: region.minKeywordsPerDay,
      performance_weight: region.performanceWeight,
      is_active: region.isActive,
    };
    const { data, error } = await supabaseAdmin
      .from("region_rotation")
      .upsert(row, { onConflict: "region_code" })
      .select()
      .single();
    if (error) throw error;
    return rowToRegion(data as RegionRow);
  }

  async setRegionActive(regionCode: string, active: boolean): Promise<void> {
    const supabaseAdmin = await this.getAdmin();
    const { error } = await supabaseAdmin
      .from("region_rotation")
      .update({ is_active: active })
      .eq("region_code", regionCode);
    if (error) throw error;
  }

  async updateRegionOrder(regionCode: string, displayOrder: number): Promise<void> {
    const supabaseAdmin = await this.getAdmin();
    const { error } = await supabaseAdmin
      .from("region_rotation")
      .update({ display_order: displayOrder })
      .eq("region_code", regionCode);
    if (error) throw error;
  }

  // ---- Templates ----

  async listTemplates(regionCode?: string): Promise<KeywordTemplate[]> {
    const supabaseAdmin = await this.getAdmin();
    let query = supabaseAdmin
      .from("keyword_templates")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (regionCode) {
      query = query.or(`region_code.is.null,region_code.eq.${regionCode}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data as TemplateRow[]) ?? []).map(rowToTemplate);
  }

  async getTemplate(id: string): Promise<KeywordTemplate | null> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("keyword_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToTemplate(data as TemplateRow) : null;
  }

  async upsertTemplate(template: KeywordTemplate): Promise<KeywordTemplate> {
    const supabaseAdmin = await this.getAdmin();
    const row = {
      id: template.id,
      name: template.name,
      description: template.description,
      region_code: template.regionCode,
      base_patterns: template.basePatterns,
      category_modifiers: template.categoryModifiers,
      city_modifiers: template.cityModifiers,
      language_modifiers: template.languageModifiers,
      suffixes: template.suffixes,
      max_combinations_per_run: template.maxCombinationsPerRun,
      priority: template.priority,
      source_tag: template.sourceTag,
      is_active: template.isActive,
    };
    const { data, error } = await supabaseAdmin
      .from("keyword_templates")
      .upsert(row, { onConflict: "name" })
      .select()
      .single();
    if (error) throw error;
    return rowToTemplate(data as TemplateRow);
  }

  async deleteTemplate(id: string): Promise<void> {
    const supabaseAdmin = await this.getAdmin();
    const { error } = await supabaseAdmin.from("keyword_templates").delete().eq("id", id);
    if (error) throw error;
  }

  // ---- Performance ----

  async getKeywordPerformance(
    regionCode: string,
    windowDays: number,
  ): Promise<KeywordPerformance[]> {
    const supabaseAdmin = await this.getAdmin();
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);
    const windowStartStr = windowStart.toISOString().split("T")[0];
    const windowEndStr = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseAdmin
      .from("keyword_performance")
      .select("*")
      .eq("region_code", regionCode)
      .gte("window_start", windowStartStr)
      .lte("window_end", windowEndStr)
      .order("performance_score", { ascending: false });
    if (error) throw error;
    return ((data as PerformanceRow[]) ?? []).map(rowToPerformance);
  }

  async upsertKeywordPerformance(perf: KeywordPerformance): Promise<KeywordPerformance> {
    const supabaseAdmin = await this.getAdmin();
    const row = {
      keyword_id: perf.keywordId,
      keyword: perf.keyword,
      normalized_keyword: perf.normalizedKeyword,
      region_code: null, // Would need to be passed in
      window_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      window_end: new Date().toISOString().split("T")[0],
      total_searches: perf.totalSearches,
      total_leads_found: perf.totalLeadsFound,
      total_new_leads: perf.totalNewLeads,
      total_duplicates: 0,
      total_verified_valid: 0,
      total_approved: 0,
      total_contacted: 0,
      total_replied: 0,
      total_interested: 0,
      total_customers: 0,
      lead_rate: perf.leadRate,
      new_lead_rate: perf.newLeadRate,
      verification_rate: 0,
      approval_rate: 0,
      reply_rate: 0,
      conversion_rate: 0,
      performance_score: perf.performanceScore,
      region_rank: perf.regionRank,
    };
    const { data, error } = await supabaseAdmin
      .from("keyword_performance")
      .upsert(row, { onConflict: "keyword_id,window_start,window_end" })
      .select()
      .single();
    if (error) throw error;
    return rowToPerformance(data as PerformanceRow);
  }

  async recalculateAllPerformance(windowDays: number): Promise<number> {
    const supabaseAdmin = await this.getAdmin();

    // This is a complex aggregation - use RPC or do in application layer
    // For now, return count of updated records
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);
    const windowStartStr = windowStart.toISOString().split("T")[0];
    const windowEndStr = new Date().toISOString().split("T")[0];

    // Get all keywords with usage in window
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from("keyword_usage_log")
      .select("keyword_id, keyword, event_type, leads_found, new_leads, duplicates, created_at")
      .in("event_type", ["search_started", "search_completed"])
      .gte("created_at", windowStartStr)
      .lt("created_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    if (usageError) throw usageError;

    // Aggregate by keyword
    const agg = new Map<
      string,
      {
        keywordId: string;
        keyword: string;
        searches: number;
        leadsFound: number;
        newLeads: number;
      }
    >();

    for (const u of (usageData as any[]) ?? []) {
      const existing = agg.get(u.keyword_id) || {
        keywordId: u.keyword_id,
        keyword: u.keyword,
        searches: 0,
        leadsFound: 0,
        newLeads: 0,
      };
      existing.searches += 1;
      existing.leadsFound += u.leads_found ?? 0;
      existing.newLeads += u.new_leads ?? 0;
      agg.set(u.keyword_id, existing);
    }

    // Upsert performance records
    let updated = 0;
    for (const [, v] of agg) {
      const leadRate = v.searches > 0 ? v.leadsFound / v.searches : 0;
      const newLeadRate = v.searches > 0 ? v.newLeads / v.searches : 0;
      const score = Math.round(Math.min(100, (leadRate * 0.5 + newLeadRate * 0.5) * 100));

      const { error } = await supabaseAdmin.from("keyword_performance").upsert(
        {
          keyword_id: v.keywordId,
          keyword: v.keyword,
          normalized_keyword: v.keyword.toLowerCase().trim().replace(/\s+/g, " "),
          region_code: null,
          window_start: windowStartStr,
          window_end: windowEndStr,
          total_searches: v.searches,
          total_leads_found: v.leadsFound,
          total_new_leads: v.newLeads,
          performance_score: score,
        },
        { onConflict: "keyword_id,window_start,window_end" },
      );

      if (!error) updated++;
    }

    return updated;
  }

  // ---- Daily Runs ----

  async createDailyRun(run: DailyRunResult): Promise<DailyRunResult> {
    const supabaseAdmin = await this.getAdmin();
    const row = {
      id: run.runId,
      run_date: run.runDate,
      region_code: run.regionCode,
      region_name: run.regionName,
      status: run.status,
      config_snapshot: run.configSnapshot,
      selected_keywords: run.selectedKeywords,
      total_keywords_selected: run.totalKeywordsSelected,
      total_searches_initiated: 0,
      total_searches_completed: 0,
      total_leads_found: 0,
      total_new_leads: 0,
      total_duplicates: 0,
      lead_finder_job_ids: [],
    };
    const { data, error } = await supabaseAdmin
      .from("daily_keyword_runs")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return rowToDailyRun(data as DailyRunRow);
  }

  async getDailyRun(runId: string): Promise<DailyRunResult | null> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("daily_keyword_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToDailyRun(data as DailyRunRow) : null;
  }

  async getDailyRunByDate(date: string): Promise<DailyRunResult | null> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("daily_keyword_runs")
      .select("*")
      .eq("run_date", date)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToDailyRun(data as DailyRunRow) : null;
  }

  async updateDailyRun(runId: string, patch: Partial<DailyRunResult>): Promise<DailyRunResult> {
    const supabaseAdmin = await this.getAdmin();
    const rowPatch: Partial<DailyRunRow> = {};
    if (patch.status !== undefined) rowPatch.status = patch.status;
    if (patch.selectedKeywords !== undefined) rowPatch.selected_keywords = patch.selectedKeywords;
    if (patch.totalKeywordsSelected !== undefined)
      rowPatch.total_keywords_selected = patch.totalKeywordsSelected;
    if (patch.configSnapshot !== undefined) rowPatch.config_snapshot = patch.configSnapshot;
    if (patch.totalSearchesInitiated !== undefined)
      rowPatch.total_searches_initiated = patch.totalSearchesInitiated;
    if (patch.totalSearchesCompleted !== undefined)
      rowPatch.total_searches_completed = patch.totalSearchesCompleted;
    if (patch.totalLeadsFound !== undefined) rowPatch.total_leads_found = patch.totalLeadsFound;
    if (patch.totalNewLeads !== undefined) rowPatch.total_new_leads = patch.totalNewLeads;
    if (patch.totalDuplicates !== undefined) rowPatch.total_duplicates = patch.totalDuplicates;
    if (patch.leadFinderJobIds !== undefined) rowPatch.lead_finder_job_ids = patch.leadFinderJobIds;
    if (patch.errorMessage !== undefined) rowPatch.error_message = patch.errorMessage;
    if (patch.errorDetails !== undefined) rowPatch.error_details = patch.errorDetails;
    if (patch.startedAt !== undefined) rowPatch.started_at = patch.startedAt;
    if (patch.completedAt !== undefined) rowPatch.completed_at = patch.completedAt;
    if (patch.durationMs !== undefined) rowPatch.duration_ms = patch.durationMs;

    const { data, error } = await supabaseAdmin
      .from("daily_keyword_runs")
      .update(rowPatch)
      .eq("id", runId)
      .select()
      .single();
    if (error) throw error;
    return rowToDailyRun(data as DailyRunRow);
  }

  async listDailyRuns(limit = 50, offset = 0): Promise<DailyRunResult[]> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("daily_keyword_runs")
      .select("*")
      .order("run_date", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return ((data as DailyRunRow[]) ?? []).map(rowToDailyRun);
  }

  // ---- Daily Selections ----

  async insertDailySelections(selections: SelectedKeyword[], runId: string): Promise<void> {
    const supabaseAdmin = await this.getAdmin();
    const rows = selections.map((s) => ({
      run_id: runId,
      keyword_id: s.keywordId,
      keyword: s.keyword,
      normalized_keyword: s.normalizedKeyword,
      source: s.source,
      priority: s.priority,
      daily_target: s.dailyTarget,
      selection_reason: s.selectionReason,
      performance_score: s.performanceScore,
      region_rank: s.regionRank,
      search_initiated: false,
      search_completed: false,
      leads_found: 0,
      new_leads: 0,
      duplicates: 0,
    }));
    const { error } = await supabaseAdmin.from("daily_keyword_selections").insert(rows);
    if (error) throw error;
  }

  async getDailySelections(runId: string): Promise<SelectedKeyword[]> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("daily_keyword_selections")
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ((data as DailySelectionRow[]) ?? []).map(rowToSelection);
  }

  async updateDailySelection(selectionId: string, patch: Partial<SelectedKeyword>): Promise<void> {
    const supabaseAdmin = await this.getAdmin();
    const rowPatch: Partial<DailySelectionRow> = {};
    if (patch.searchInitiated !== undefined) rowPatch.search_initiated = patch.searchInitiated;
    if (patch.searchCompleted !== undefined) rowPatch.search_completed = patch.searchCompleted;
    if (patch.leadsFound !== undefined) rowPatch.leads_found = patch.leadsFound;
    if (patch.newLeads !== undefined) rowPatch.new_leads = patch.newLeads;
    if (patch.duplicates !== undefined) rowPatch.duplicates = patch.duplicates;
    if (patch.leadFinderJobId !== undefined) rowPatch.lead_finder_job_id = patch.leadFinderJobId;
    if (patch.errorMessage !== undefined) rowPatch.error_message = patch.errorMessage;

    const { error } = await supabaseAdmin
      .from("daily_keyword_selections")
      .update(rowPatch)
      .eq("id", selectionId);
    if (error) throw error;
  }

  // ---- Config ----

  async getConfig(): Promise<IntelligenceConfig> {
    const supabaseAdmin = await this.getAdmin();
    const { data, error } = await supabaseAdmin
      .from("keyword_intelligence_config")
      .select("config_key, config_value");
    if (error) throw error;

    const map = new Map((data as ConfigRow[])?.map((r) => [r.config_key, r.config_value]) ?? []);
    return {
      rotationMode: (map.get("rotation_mode") as string) ?? "sequential",
      fixedRegionCode: (map.get("fixed_region_code") as string) ?? null,
      analysisWindowDays: (map.get("analysis_window_days") as number) ?? 30,
      minPerformanceScore: (map.get("min_performance_score") as number) ?? 10,
      performanceScoreWeights: (map.get(
        "performance_score_weights",
      ) as IntelligenceConfig["performanceScoreWeights"]) ?? {
        leadRate: 0.25,
        newLeadRate: 0.25,
        verificationRate: 0.15,
        approvalRate: 0.15,
        replyRate: 0.1,
        conversionRate: 0.1,
      },
      duplicationAvoidanceDays: (map.get("duplication_avoidance_days") as number) ?? 14,
      maxKeywordsPerRegionPerDay: (map.get("max_keywords_per_region_per_day") as number) ?? 20,
      minKeywordsPerRegionPerDay: (map.get("min_keywords_per_region_per_day") as number) ?? 5,
      autoGenerateKeywords: (map.get("auto_generate_keywords") as boolean) ?? true,
      leadFinderBatchSize: (map.get("lead_finder_batch_size") as number) ?? 10,
      enableLeadFinderIntegration: (map.get("enable_lead_finder_integration") as boolean) ?? true,
      notificationOnFailure: (map.get("notification_on_failure") as boolean) ?? true,
    };
  }

  async setConfig(key: string, value: unknown): Promise<void> {
    const supabaseAdmin = await this.getAdmin();
    const { error } = await supabaseAdmin
      .from("keyword_intelligence_config")
      .upsert({ config_key: key, config_value: value }, { onConflict: "config_key" });
    if (error) throw error;
  }

  async bulkSetConfig(configs: Array<{ key: string; value: unknown }>): Promise<void> {
    const supabaseAdmin = await this.getAdmin();
    const rows = configs.map((c) => ({ config_key: c.key, config_value: c.value }));
    const { error } = await supabaseAdmin
      .from("keyword_intelligence_config")
      .upsert(rows, { onConflict: "config_key" });
    if (error) throw error;
  }

  // ---- Recent Keywords ----

  async getRecentKeywordNorms(days: number, regionCode?: string): Promise<Set<string>> {
    const supabaseAdmin = await this.getAdmin();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString();

    let query = supabaseAdmin
      .from("keyword_usage_log")
      .select("normalized_keyword:keyword_pool!inner(normalized_keyword)")
      .in("event_type", ["search_started", "search_completed"])
      .gte("created_at", startStr);

    if (regionCode) {
      query = query.eq(
        "daily_keyword_selections.run_id",
        `daily_keyword_runs.region_code.eq.${regionCode}`,
      );
      // This join is complex; for now fetch all and filter in memory
    }

    const { data, error } = await query;
    if (error) throw error;

    const norms = new Set<string>();
    for (const row of (data as any[]) ?? []) {
      if (row.normalized_keyword) norms.add(row.normalized_keyword);
    }
    return norms;
  }

  // ---- Lead Finder Job Tracking ----

  async addLeadFinderJobIds(runId: string, jobIds: string[]): Promise<void> {
    const supabaseAdmin = await this.getAdmin();
    const { error } = await supabaseAdmin
      .from("daily_keyword_runs")
      .update({ lead_finder_job_ids: jobIds })
      .eq("id", runId);
    if (error) throw error;
  }
}

// ============================================================
// IN-MEMORY IMPLEMENTATION (TESTS & DEV FALLBACK)
// ============================================================

export class InMemoryKeywordIntelligenceStore implements KeywordIntelligenceStore {
  regions: Map<string, RegionConfig> = new Map();
  templates: Map<string, KeywordTemplate> = new Map();
  performance: Map<string, KeywordPerformance[]> = new Map(); // keywordId -> performance[]
  dailyRuns: Map<string, DailyRunResult> = new Map();
  dailyRunsByDate: Map<string, DailyRunResult> = new Map();
  dailySelections: Map<string, SelectedKeyword[]> = new Map(); // runId -> selections
  config: IntelligenceConfig = {
    rotationMode: "sequential",
    fixedRegionCode: null,
    analysisWindowDays: 30,
    minPerformanceScore: 10,
    performanceScoreWeights: {
      leadRate: 0.25,
      newLeadRate: 0.25,
      verificationRate: 0.15,
      approvalRate: 0.15,
      replyRate: 0.1,
      conversionRate: 0.1,
    },
    duplicationAvoidanceDays: 14,
    maxKeywordsPerRegionPerDay: 20,
    minKeywordsPerRegionPerDay: 5,
    autoGenerateKeywords: true,
    leadFinderBatchSize: 10,
    enableLeadFinderIntegration: true,
    notificationOnFailure: true,
  };

  async listRegions(): Promise<RegionConfig[]> {
    return Array.from(this.regions.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getRegion(regionCode: string): Promise<RegionConfig | null> {
    return this.regions.get(regionCode) ?? null;
  }

  async upsertRegion(region: RegionConfig): Promise<RegionConfig> {
    this.regions.set(region.regionCode, { ...region });
    return { ...region };
  }

  async setRegionActive(regionCode: string, active: boolean): Promise<void> {
    const r = this.regions.get(regionCode);
    if (r) {
      r.isActive = active;
      this.regions.set(regionCode, r);
    }
  }

  async updateRegionOrder(regionCode: string, displayOrder: number): Promise<void> {
    const r = this.regions.get(regionCode);
    if (r) {
      r.displayOrder = displayOrder;
      this.regions.set(regionCode, r);
    }
  }

  async listTemplates(regionCode?: string): Promise<KeywordTemplate[]> {
    return Array.from(this.templates.values())
      .filter(
        (t) => t.isActive && (!regionCode || t.regionCode === null || t.regionCode === regionCode),
      )
      .sort((a, b) => a.priority - b.priority);
  }

  async getTemplate(id: string): Promise<KeywordTemplate | null> {
    return this.templates.get(id) ?? null;
  }

  async upsertTemplate(template: KeywordTemplate): Promise<KeywordTemplate> {
    this.templates.set(template.id, { ...template });
    return { ...template };
  }

  async deleteTemplate(id: string): Promise<void> {
    this.templates.delete(id);
  }

  async getKeywordPerformance(
    regionCode: string,
    windowDays: number,
  ): Promise<KeywordPerformance[]> {
    const all = Array.from(this.performance.values()).flat();
    // Filter by region would need region_code in performance record
    return all.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  async upsertKeywordPerformance(perf: KeywordPerformance): Promise<KeywordPerformance> {
    const existing = this.performance.get(perf.keywordId) ?? [];
    const idx = existing.findIndex((p) => p.keywordId === perf.keywordId);
    if (idx >= 0) existing[idx] = perf;
    else existing.push(perf);
    this.performance.set(perf.keywordId, existing);
    return perf;
  }

  async recalculateAllPerformance(windowDays: number): Promise<number> {
    return 0;
  }

  async createDailyRun(run: DailyRunResult): Promise<DailyRunResult> {
    this.dailyRuns.set(run.runId, { ...run });
    this.dailyRunsByDate.set(run.runDate, { ...run });
    return { ...run };
  }

  async getDailyRun(runId: string): Promise<DailyRunResult | null> {
    return this.dailyRuns.get(runId) ?? null;
  }

  async getDailyRunByDate(date: string): Promise<DailyRunResult | null> {
    return this.dailyRunsByDate.get(date) ?? null;
  }

  async updateDailyRun(runId: string, patch: Partial<DailyRunResult>): Promise<DailyRunResult> {
    const existing = this.dailyRuns.get(runId);
    if (!existing) throw new Error("Run not found");
    const updated = { ...existing, ...patch };
    this.dailyRuns.set(runId, updated);
    this.dailyRunsByDate.set(updated.runDate, updated);
    return updated;
  }

  async listDailyRuns(limit = 50, offset = 0): Promise<DailyRunResult[]> {
    return Array.from(this.dailyRuns.values())
      .sort((a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime())
      .slice(offset, offset + limit);
  }

  async insertDailySelections(selections: SelectedKeyword[], runId: string): Promise<void> {
    this.dailySelections.set(
      runId,
      selections.map((s) => ({ ...s })),
    );
  }

  async getDailySelections(runId: string): Promise<SelectedKeyword[]> {
    return this.dailySelections.get(runId) ?? [];
  }

  async updateDailySelection(selectionId: string, patch: Partial<SelectedKeyword>): Promise<void> {
    // In-memory: selectionId is keywordId
    for (const [runId, selections] of this.dailySelections.entries()) {
      const idx = selections.findIndex((s) => s.keywordId === selectionId);
      if (idx >= 0) {
        selections[idx] = { ...selections[idx], ...patch };
        this.dailySelections.set(runId, selections);
        return;
      }
    }
  }

  async getConfig(): Promise<IntelligenceConfig> {
    return { ...this.config };
  }

  async setConfig(key: string, value: unknown): Promise<void> {
    (this.config as any)[key] = value;
  }

  async bulkSetConfig(configs: Array<{ key: string; value: unknown }>): Promise<void> {
    for (const c of configs) (this.config as any)[c.key] = c.value;
  }

  async getRecentKeywordNorms(days: number, regionCode?: string): Promise<Set<string>> {
    // Simplified: return empty set for in-memory
    return new Set();
  }

  async addLeadFinderJobIds(runId: string, jobIds: string[]): Promise<void> {
    const run = this.dailyRuns.get(runId);
    if (run) {
      (run as any).leadFinderJobIds = jobIds;
      this.dailyRuns.set(runId, run);
    }
  }

  // Test helpers
  clear() {
    this.regions.clear();
    this.templates.clear();
    this.performance.clear();
    this.dailyRuns.clear();
    this.dailyRunsByDate.clear();
    this.dailySelections.clear();
    this.config = {
      rotationMode: "sequential",
      fixedRegionCode: null,
      analysisWindowDays: 30,
      minPerformanceScore: 10,
      performanceScoreWeights: {
        leadRate: 0.25,
        newLeadRate: 0.25,
        verificationRate: 0.15,
        approvalRate: 0.15,
        replyRate: 0.1,
        conversionRate: 0.1,
      },
      duplicationAvoidanceDays: 14,
      maxKeywordsPerRegionPerDay: 20,
      minKeywordsPerRegionPerDay: 5,
      autoGenerateKeywords: true,
      leadFinderBatchSize: 10,
      enableLeadFinderIntegration: true,
      notificationOnFailure: true,
    };
  }

  async seedRegions(regions: RegionConfig[]) {
    for (const r of regions) await this.upsertRegion(r);
  }

  async seedTemplates(templates: KeywordTemplate[]) {
    for (const t of templates) await this.upsertTemplate(t);
  }
}

// ============================================================
// SINGLETON FACTORY
// ============================================================

let _supabaseStore: SupabaseKeywordIntelligenceStore | null = null;
let _memoryFallback: InMemoryKeywordIntelligenceStore | null = null;

function hasSupabaseEnv(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getKeywordIntelligenceStore(): KeywordIntelligenceStore {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    if (!_memoryFallback) _memoryFallback = new InMemoryKeywordIntelligenceStore();
    return _memoryFallback;
  }
  if (hasSupabaseEnv()) {
    if (!_supabaseStore) _supabaseStore = new SupabaseKeywordIntelligenceStore();
    return _supabaseStore;
  }
  if (!_memoryFallback) _memoryFallback = new InMemoryKeywordIntelligenceStore();
  return _memoryFallback;
}

export function createIsolatedMemoryStore(): InMemoryKeywordIntelligenceStore {
  return new InMemoryKeywordIntelligenceStore();
}

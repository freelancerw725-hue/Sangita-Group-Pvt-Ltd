/**
 * Keyword Intelligence Engine — Core Business Logic
 * Deterministic daily keyword selection, region rotation, performance analysis.
 * Zero LLM/AI dependencies — fully configurable from Sangita Core.
 */

import { normalizeKeyword } from "../keywords/normalize";
import type { Keyword, KeywordSource } from "../keywords/types";

// ============================================================
// TYPES
// ============================================================

export interface RegionConfig {
  regionCode: string;
  regionName: string;
  displayOrder: number;
  keywordTemplates: string[];
  businessCategories: string[];
  cityModifiers: string[];
  languageModifiers: string[];
  maxKeywordsPerDay: number;
  minKeywordsPerDay: number;
  performanceWeight: number;
  isActive: boolean;
}

export interface KeywordTemplate {
  id: string;
  name: string;
  description: string | null;
  regionCode: string | null;
  basePatterns: string[];
  categoryModifiers: string[];
  cityModifiers: string[];
  languageModifiers: string[];
  suffixes: string[];
  maxCombinationsPerRun: number;
  priority: number;
  sourceTag: string;
  isActive: boolean;
}

export interface IntelligenceConfig {
  rotationMode: "sequential" | "performance" | "manual";
  fixedRegionCode: string | null;
  analysisWindowDays: number;
  minPerformanceScore: number;
  performanceScoreWeights: {
    leadRate: number;
    newLeadRate: number;
    verificationRate: number;
    approvalRate: number;
    replyRate: number;
    conversionRate: number;
  };
  duplicationAvoidanceDays: number;
  maxKeywordsPerRegionPerDay: number;
  minKeywordsPerRegionPerDay: number;
  autoGenerateKeywords: boolean;
  leadFinderBatchSize: number;
  enableLeadFinderIntegration: boolean;
  notificationOnFailure: boolean;
}

export interface KeywordPerformance {
  keywordId: string;
  keyword: string;
  normalizedKeyword: string;
  totalSearches: number;
  totalLeadsFound: number;
  totalNewLeads: number;
  leadRate: number;
  newLeadRate: number;
  performanceScore: number;
  regionRank: number;
}

export interface DailyRunConfigSnapshot {
  regionCode: string;
  regionName: string;
  rotationMode: string;
  analysisWindowDays: number;
  maxKeywords: number;
  minKeywords: number;
  duplicationAvoidanceDays: number;
  performanceWeights: Record<string, number>;
  templatesUsed: string[];
}

export interface SelectedKeyword {
  keywordId: string;
  keyword: string;
  normalizedKeyword: string;
  source: KeywordSource | "generated";
  priority: number;
  dailyTarget: number;
  selectionReason: string;
  performanceScore: number | null;
  regionRank: number | null;
  templateId: string | null;
}

export interface DailyRunResult {
  runId: string;
  runDate: string;
  regionCode: string;
  regionName: string;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  selectedKeywords: SelectedKeyword[];
  totalKeywordsSelected: number;
  configSnapshot: DailyRunConfigSnapshot;
}

export interface LeadFinderKeywordPayload {
  keyword: string;
  source: KeywordSource;
  dailyTarget: number;
  priority: number;
  regionCode: string;
  regionName: string;
  runId: string;
  selectionReason: string;
}

// ============================================================
// VALIDATION CONSTANTS
// ============================================================

export const DEFAULT_ANALYSIS_WINDOW_DAYS = 30;
export const DEFAULT_MIN_PERFORMANCE_SCORE = 10;
export const DEFAULT_DUPLICATION_AVOIDANCE_DAYS = 14;
export const DEFAULT_MAX_KEYWORDS_PER_DAY = 20;
export const DEFAULT_MIN_KEYWORDS_PER_DAY = 5;
export const DEFAULT_LEAD_FINDER_BATCH_SIZE = 10;

// ============================================================
// VALIDATION ERRORS
// ============================================================

export class IntelligenceValidationError extends Error {
  code = "INTELLIGENCE_VALIDATION_ERROR";
}

export class NoEligibleRegionError extends Error {
  code = "NO_ELIGIBLE_REGION";
}

export class NoKeywordsGeneratedError extends Error {
  code = "NO_KEYWORDS_GENERATED";
}

export class LeadFinderIntegrationError extends Error {
  code = "LEAD_FINDER_INTEGRATION_ERROR";
}

// ============================================================
// CONFIG VALIDATION
// ============================================================

export function validateIntelligenceConfig(
  config: Partial<IntelligenceConfig>,
): IntelligenceConfig {
  const defaults: IntelligenceConfig = {
    rotationMode: "sequential",
    fixedRegionCode: null,
    analysisWindowDays: DEFAULT_ANALYSIS_WINDOW_DAYS,
    minPerformanceScore: DEFAULT_MIN_PERFORMANCE_SCORE,
    performanceScoreWeights: {
      leadRate: 0.25,
      newLeadRate: 0.25,
      verificationRate: 0.15,
      approvalRate: 0.15,
      replyRate: 0.1,
      conversionRate: 0.1,
    },
    duplicationAvoidanceDays: DEFAULT_DUPLICATION_AVOIDANCE_DAYS,
    maxKeywordsPerRegionPerDay: DEFAULT_MAX_KEYWORDS_PER_DAY,
    minKeywordsPerRegionPerDay: DEFAULT_MIN_KEYWORDS_PER_DAY,
    autoGenerateKeywords: true,
    leadFinderBatchSize: DEFAULT_LEAD_FINDER_BATCH_SIZE,
    enableLeadFinderIntegration: true,
    notificationOnFailure: true,
  };

  if (config.rotationMode !== undefined) {
    if (!["sequential", "performance", "manual"].includes(config.rotationMode)) {
      throw new IntelligenceValidationError(
        "rotationMode must be 'sequential', 'performance', or 'manual'",
      );
    }
  }

  if (config.analysisWindowDays !== undefined) {
    if (
      !Number.isInteger(config.analysisWindowDays) ||
      config.analysisWindowDays < 1 ||
      config.analysisWindowDays > 365
    ) {
      throw new IntelligenceValidationError("analysisWindowDays must be integer 1-365");
    }
  }

  if (config.minPerformanceScore !== undefined) {
    if (
      !Number.isInteger(config.minPerformanceScore) ||
      config.minPerformanceScore < 0 ||
      config.minPerformanceScore > 100
    ) {
      throw new IntelligenceValidationError("minPerformanceScore must be integer 0-100");
    }
  }

  if (config.duplicationAvoidanceDays !== undefined) {
    if (
      !Number.isInteger(config.duplicationAvoidanceDays) ||
      config.duplicationAvoidanceDays < 0 ||
      config.duplicationAvoidanceDays > 90
    ) {
      throw new IntelligenceValidationError("duplicationAvoidanceDays must be integer 0-90");
    }
  }

  if (config.maxKeywordsPerRegionPerDay !== undefined) {
    if (
      !Number.isInteger(config.maxKeywordsPerRegionPerDay) ||
      config.maxKeywordsPerRegionPerDay < 1 ||
      config.maxKeywordsPerRegionPerDay > 100
    ) {
      throw new IntelligenceValidationError("maxKeywordsPerRegionPerDay must be integer 1-100");
    }
  }

  if (config.minKeywordsPerRegionPerDay !== undefined) {
    if (
      !Number.isInteger(config.minKeywordsPerRegionPerDay) ||
      config.minKeywordsPerRegionPerDay < 1
    ) {
      throw new IntelligenceValidationError("minKeywordsPerRegionPerDay must be integer >= 1");
    }
  }

  if (config.leadFinderBatchSize !== undefined) {
    if (
      !Number.isInteger(config.leadFinderBatchSize) ||
      config.leadFinderBatchSize < 1 ||
      config.leadFinderBatchSize > 50
    ) {
      throw new IntelligenceValidationError("leadFinderBatchSize must be integer 1-50");
    }
  }

  if (config.performanceScoreWeights !== undefined) {
    const weights = config.performanceScoreWeights;
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      throw new IntelligenceValidationError("performanceScoreWeights must sum to 1.0");
    }
    for (const [key, value] of Object.entries(weights)) {
      if (typeof value !== "number" || value < 0 || value > 1) {
        throw new IntelligenceValidationError(`performanceScoreWeights.${key} must be number 0-1`);
      }
    }
  }

  return {
    ...defaults,
    ...config,
    performanceScoreWeights: {
      ...defaults.performanceScoreWeights,
      ...(config.performanceScoreWeights || {}),
    },
  };
}

// ============================================================
// REGION ROTATION LOGIC
// ============================================================

/**
 * Get the next region in rotation based on configuration and current state.
 * Sequential mode: round-robin through active regions ordered by display_order.
 * Manual mode: always return fixed region.
 * Performance mode: returns region with best average performance (handled in app layer).
 */
export function getNextRegion(
  regions: RegionConfig[],
  currentRegionCode: string | null,
  config: IntelligenceConfig,
  regionPerformance?: Map<string, number>,
): RegionConfig | null {
  const activeRegions = regions
    .filter((r) => r.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (activeRegions.length === 0) return null;

  if (config.rotationMode === "manual") {
    if (!config.fixedRegionCode) {
      throw new IntelligenceValidationError("fixedRegionCode required for manual rotation mode");
    }
    const fixed = activeRegions.find((r) => r.regionCode === config.fixedRegionCode);
    if (!fixed)
      throw new IntelligenceValidationError(
        `Fixed region ${config.fixedRegionCode} not found or inactive`,
      );
    return fixed;
  }

  if (config.rotationMode === "performance" && regionPerformance && regionPerformance.size > 0) {
    // Sort by performance score descending
    const sorted = [...activeRegions].sort((a, b) => {
      const perfA = regionPerformance.get(a.regionCode) ?? 0;
      const perfB = regionPerformance.get(b.regionCode) ?? 0;
      return perfB - perfA;
    });
    return sorted[0];
  }

  // Sequential mode (default)
  if (!currentRegionCode) return activeRegions[0];

  const currentIndex = activeRegions.findIndex((r) => r.regionCode === currentRegionCode);
  if (currentIndex === -1) return activeRegions[0]; // Current region not in active list

  const nextIndex = (currentIndex + 1) % activeRegions.length;
  return activeRegions[nextIndex];
}

/**
 * Get the most recent run date to determine current region.
 */
export function getLastRunRegion(runs: { regionCode: string; runDate: string }[]): string | null {
  if (runs.length === 0) return null;
  const sorted = [...runs].sort(
    (a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime(),
  );
  return sorted[0].regionCode;
}

// ============================================================
// KEYWORD GENERATION (DETERMINISTIC)
// ============================================================

/**
 * Generate keyword combinations from templates deterministically.
 * No randomness — same inputs always produce same outputs.
 */
export function generateKeywordsFromTemplates(
  templates: KeywordTemplate[],
  region: RegionConfig,
  existingKeywords: Set<string>,
  maxTotal: number,
): { keyword: string; templateId: string; source: "generated"; priority: number }[] {
  const results: { keyword: string; templateId: string; source: "generated"; priority: number }[] =
    [];
  const seen = new Set<string>(existingKeywords);

  // Sort templates by priority (lower = higher priority)
  const sortedTemplates = [...templates]
    .filter((t) => t.isActive)
    .sort((a, b) => a.priority - b.priority);

  for (const template of sortedTemplates) {
    if (results.length >= maxTotal) break;

    const regionTemplates =
      template.regionCode === null || template.regionCode === region.regionCode;
    if (!regionTemplates) continue;

    const combinations = expandTemplate(template, region);
    let addedFromTemplate = 0;

    for (const keyword of combinations) {
      if (results.length >= maxTotal) break;
      if (addedFromTemplate >= template.maxCombinationsPerRun) break;

      const normalized = normalizeKeyword(keyword);
      if (!normalized) continue;
      if (seen.has(normalized)) continue;

      seen.add(normalized);
      results.push({
        keyword: keyword.trim().replace(/\s+/g, " "),
        templateId: template.id,
        source: "generated",
        priority: template.priority,
      });
      addedFromTemplate++;
    }
  }

  return results;
}

/**
 * Expand a template into all possible keyword combinations.
 * Deterministic: uses fixed iteration order, no randomness.
 */
function expandTemplate(template: KeywordTemplate, region: RegionConfig): string[] {
  const results: string[] = [];

  // Build modifier lists with region-specific fallbacks
  const categories =
    template.categoryModifiers.length > 0 ? template.categoryModifiers : region.businessCategories;

  const cities = template.cityModifiers.length > 0 ? template.cityModifiers : region.cityModifiers;

  const languages =
    template.languageModifiers.length > 0 ? template.languageModifiers : region.languageModifiers;

  const suffixes =
    template.suffixes.length > 0
      ? template.suffixes
      : ["Live", "Updates", "Today", "Breaking", "Latest", "Headlines"];

  // Pattern expansion: deterministic nested loops
  for (const pattern of template.basePatterns) {
    for (const category of categories) {
      for (const city of cities) {
        for (const language of languages) {
          for (const suffix of suffixes) {
            let keyword = pattern
              .replace(/\{region\}/g, region.regionName)
              .replace(/\{category\}/g, category)
              .replace(/\{city\}/g, city)
              .replace(/\{language\}/g, language)
              .replace(/\{suffix\}/g, suffix);

            // Also generate without language modifier for broader coverage
            if (pattern.includes("{language}")) {
              const withoutLang = pattern
                .replace(/\{region\}/g, region.regionName)
                .replace(/\{category\}/g, category)
                .replace(/\{city\}/g, city)
                .replace(/\s*\{language\}\s*/g, " ")
                .replace(/\{suffix\}/g, suffix);
              results.push(withoutLang.trim().replace(/\s+/g, " "));
            }

            results.push(keyword.trim().replace(/\s+/g, " "));
          }
        }
      }
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  return results.filter((k) => {
    const norm = normalizeKeyword(k);
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

// ============================================================
// PERFORMANCE SCORING
// ============================================================

/**
 * Calculate composite performance score (0-100) from component rates.
 * All rates should be 0-1. Weights must sum to 1.
 */
export function calculatePerformanceScore(
  metrics: {
    leadRate: number;
    newLeadRate: number;
    verificationRate: number;
    approvalRate: number;
    replyRate: number;
    conversionRate: number;
  },
  weights: IntelligenceConfig["performanceScoreWeights"],
): number {
  const score =
    metrics.leadRate * weights.leadRate +
    metrics.newLeadRate * weights.newLeadRate +
    metrics.verificationRate * weights.verificationRate +
    metrics.approvalRate * weights.approvalRate +
    metrics.replyRate * weights.replyRate +
    metrics.conversionRate * weights.conversionRate;

  return Math.round(Math.min(100, Math.max(0, score * 100)));
}

/**
 * Compute performance metrics from raw keyword usage and lead data.
 */
export function computeKeywordMetrics(
  usageLogs: Array<{
    eventType: string;
    leadsFound: number;
    newLeads: number;
    duplicates: number;
  }>,
  leadStats: {
    totalVerifiedValid: number;
    totalApproved: number;
    totalContacted: number;
    totalReplied: number;
    totalInterested: number;
    totalCustomers: number;
    totalNewLeads: number;
  },
): {
  leadRate: number;
  newLeadRate: number;
  verificationRate: number;
  approvalRate: number;
  replyRate: number;
  conversionRate: number;
} {
  const totalSearches = usageLogs.filter(
    (u) => u.eventType === "search_started" || u.eventType === "search_completed",
  ).length;
  const totalLeadsFound = usageLogs.reduce((sum, u) => sum + u.leadsFound, 0);
  const totalNewLeads = usageLogs.reduce((sum, u) => sum + u.newLeads, 0);

  return {
    leadRate: totalSearches > 0 ? totalLeadsFound / totalSearches : 0,
    newLeadRate: totalSearches > 0 ? totalNewLeads / totalSearches : 0,
    verificationRate:
      leadStats.totalNewLeads > 0 ? leadStats.totalVerifiedValid / leadStats.totalNewLeads : 0,
    approvalRate:
      leadStats.totalVerifiedValid > 0 ? leadStats.totalApproved / leadStats.totalVerifiedValid : 0,
    replyRate: leadStats.totalContacted > 0 ? leadStats.totalReplied / leadStats.totalContacted : 0,
    conversionRate:
      leadStats.totalNewLeads > 0 ? leadStats.totalCustomers / leadStats.totalNewLeads : 0,
  };
}

// ============================================================
// KEYWORD SELECTION & PRIORITIZATION
// ============================================================

/**
 * Select keywords for daily run:
 * 1. Start with high-performance existing keywords (from pool)
 * 2. Fill remaining slots with generated keywords from templates
 * 3. Avoid recently used keywords (duplicate avoidance)
 * 4. Respect min/max per day limits
 */
export function selectDailyKeywords(options: {
  region: RegionConfig;
  poolKeywords: Keyword[];
  generatedKeywords: {
    keyword: string;
    templateId: string;
    source: "generated";
    priority: number;
  }[];
  keywordPerformance: Map<string, KeywordPerformance>;
  recentKeywordNorms: Set<string>;
  config: IntelligenceConfig;
  todayCounts: Map<string, number>;
}): SelectedKeyword[] {
  const {
    region,
    poolKeywords,
    generatedKeywords,
    keywordPerformance,
    recentKeywordNorms,
    config,
    todayCounts,
  } = options;

  const selected: SelectedKeyword[] = [];
  const usedNorms = new Set<string>(recentKeywordNorms);

  // Helper to check if keyword is eligible (not at daily target, not recently used)
  const isEligible = (kw: Keyword, norm: string): boolean => {
    if (kw.status !== "active") return false;
    const todayUsed = todayCounts.get(kw.id) ?? 0;
    if (todayUsed >= kw.dailyTarget) return false;
    if (usedNorms.has(norm)) return false;
    return true;
  };

  // Phase 1: Select from existing pool — prioritize by performance score, then priority, then least recently used
  const poolCandidates = poolKeywords
    .filter((kw) => isEligible(kw, kw.normalizedKeyword))
    .map((kw) => {
      const perf = keywordPerformance.get(kw.id);
      return {
        keywordId: kw.id,
        keyword: kw.keyword,
        normalizedKeyword: kw.normalizedKeyword,
        source: kw.source,
        priority: kw.priority,
        dailyTarget: kw.dailyTarget,
        selectionReason: perf
          ? `High performer (score: ${perf.performanceScore}, rank: ${perf.regionRank})`
          : "Pool keyword",
        performanceScore: perf?.performanceScore ?? null,
        regionRank: perf?.regionRank ?? null,
        templateId: null as string | null,
        _perfScore: perf?.performanceScore ?? -1,
        _priority: kw.priority,
        _lastUsed: kw.lastUsedAt ? new Date(kw.lastUsedAt).getTime() : 0,
      };
    })
    .sort((a, b) => {
      // Higher performance score first
      if (a._perfScore !== b._perfScore) return b._perfScore - a._perfScore;
      // Then lower priority number (higher priority)
      if (a._priority !== b._priority) return a._priority - b._priority;
      // Then least recently used
      return a._lastUsed - b._lastUsed;
    });

  for (const candidate of poolCandidates) {
    if (selected.length >= config.maxKeywordsPerRegionPerDay) break;
    usedNorms.add(candidate.normalizedKeyword);
    selected.push({
      keywordId: candidate.keywordId,
      keyword: candidate.keyword,
      normalizedKeyword: candidate.normalizedKeyword,
      source: candidate.source,
      priority: candidate.priority,
      dailyTarget: candidate.dailyTarget,
      selectionReason: candidate.selectionReason,
      performanceScore: candidate.performanceScore,
      regionRank: candidate.regionRank,
      templateId: candidate.templateId,
    });
  }

  // Phase 2: Fill remaining slots with generated keywords
  const remainingSlots = config.maxKeywordsPerRegionPerDay - selected.length;
  if (remainingSlots > 0 && config.autoGenerateKeywords) {
    for (const gen of generatedKeywords) {
      if (selected.length >= config.maxKeywordsPerRegionPerDay) break;
      if (usedNorms.has(normalizeKeyword(gen.keyword))) continue;

      usedNorms.add(normalizeKeyword(gen.keyword));
      selected.push({
        keywordId: "", // Will be assigned when inserted to pool
        keyword: gen.keyword,
        normalizedKeyword: normalizeKeyword(gen.keyword),
        source: "generated",
        priority: gen.priority,
        dailyTarget: region.maxKeywordsPerDay, // Use region default
        selectionReason: `Generated from template ${gen.templateId}`,
        performanceScore: null,
        regionRank: null,
        templateId: gen.templateId,
      });
    }
  }

  // Ensure minimum keywords
  if (selected.length < config.minKeywordsPerRegionPerDay && config.autoGenerateKeywords) {
    // This shouldn't happen if templates are configured, but log warning
    console.warn(
      `[KeywordIntelligence] Only ${selected.length} keywords selected for ${region.regionCode}, ` +
        `below minimum of ${config.minKeywordsPerRegionPerDay}. Check template configuration.`,
    );
  }

  return selected.slice(0, config.maxKeywordsPerRegionPerDay);
}

// ============================================================
// DAILY RUN ORCHESTRATION
// ============================================================

export interface DailyRunInput {
  runDate: Date;
  regions: RegionConfig[];
  templates: KeywordTemplate[];
  poolKeywords: Keyword[];
  keywordPerformance: Map<string, KeywordPerformance>;
  recentKeywordNorms: Set<string>;
  config: IntelligenceConfig;
  todayCounts: Map<string, number>;
  previousRuns: Array<{ regionCode: string; runDate: string }>;
}

export interface DailyRunOutput {
  run: DailyRunResult;
  leadFinderPayloads: LeadFinderKeywordPayload[];
}

export function orchestrateDailyRun(input: DailyRunInput): DailyRunOutput {
  const {
    runDate,
    regions,
    templates,
    poolKeywords,
    keywordPerformance,
    recentKeywordNorms,
    config,
    todayCounts,
    previousRuns,
  } = input;

  // Determine target region
  const lastRegion = getLastRunRegion(previousRuns);
  const targetRegion = getNextRegion(regions, lastRegion, config);

  if (!targetRegion) {
    throw new NoEligibleRegionError("No active regions configured for rotation");
  }

  // Filter pool keywords for this region (keywords don't have region directly,
  // but we can infer from performance data or use all active keywords)
  const regionPoolKeywords = poolKeywords.filter((kw) => kw.status === "active");

  // Generate new keywords from templates
  const existingNorms = new Set(poolKeywords.map((k) => k.normalizedKeyword));
  const generated = generateKeywordsFromTemplates(
    templates,
    targetRegion,
    existingNorms,
    config.maxKeywordsPerRegionPerDay,
  );

  // Select keywords for today
  const selected = selectDailyKeywords({
    region: targetRegion,
    poolKeywords: regionPoolKeywords,
    generatedKeywords: generated,
    keywordPerformance,
    recentKeywordNorms,
    config,
    todayCounts,
  });

  // Build config snapshot
  const configSnapshot: DailyRunConfigSnapshot = {
    regionCode: targetRegion.regionCode,
    regionName: targetRegion.regionName,
    rotationMode: config.rotationMode,
    analysisWindowDays: config.analysisWindowDays,
    maxKeywords: config.maxKeywordsPerRegionPerDay,
    minKeywords: config.minKeywordsPerRegionPerDay,
    duplicationAvoidanceDays: config.duplicationAvoidanceDays,
    performanceWeights: config.performanceScoreWeights,
    templatesUsed: [...new Set(selected.map((s) => s.templateId).filter(Boolean))] as string[],
  };

  const runId = crypto.randomUUID();
  const runDateStr = runDate.toISOString().split("T")[0];

  const run: DailyRunResult = {
    runId,
    runDate: runDateStr,
    regionCode: targetRegion.regionCode,
    regionName: targetRegion.regionName,
    status: "pending",
    selectedKeywords: selected,
    totalKeywordsSelected: selected.length,
    configSnapshot,
  };

  // Build Lead Finder payloads
  const leadFinderPayloads: LeadFinderKeywordPayload[] = selected.map((s) => ({
    keyword: s.keyword,
    source: s.source === "generated" ? "manual" : s.source, // Lead Finder only accepts ai/manual
    dailyTarget: s.dailyTarget,
    priority: s.priority,
    regionCode: targetRegion.regionCode,
    regionName: targetRegion.regionName,
    runId,
    selectionReason: s.selectionReason,
  }));

  return { run, leadFinderPayloads };
}

// ============================================================
// HELPER: Build region config from DB row
// ============================================================

export function buildRegionConfig(row: {
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
}): RegionConfig {
  return {
    regionCode: row.region_code,
    regionName: row.region_name,
    displayOrder: row.display_order,
    keywordTemplates: row.keyword_templates,
    businessCategories: row.business_categories,
    cityModifiers: row.city_modifiers,
    languageModifiers: row.language_modifiers,
    maxKeywordsPerDay: row.max_keywords_per_day,
    minKeywordsPerDay: row.min_keywords_per_day,
    performanceWeight: row.performance_weight,
    isActive: row.is_active,
  };
}

export function buildKeywordTemplate(row: {
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
}): KeywordTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    regionCode: row.region_code,
    basePatterns: row.base_patterns,
    categoryModifiers: row.category_modifiers,
    cityModifiers: row.city_modifiers,
    languageModifiers: row.language_modifiers,
    suffixes: row.suffixes,
    maxCombinationsPerRun: row.max_combinations_per_run,
    priority: row.priority,
    sourceTag: row.source_tag,
    isActive: row.is_active,
  };
}

export function buildIntelligenceConfig(
  rows: Array<{ config_key: string; config_value: unknown }>,
): IntelligenceConfig {
  const map = new Map(rows.map((r) => [r.config_key, r.config_value]));
  return validateIntelligenceConfig({
    rotationMode: (map.get("rotation_mode") as string) ?? "sequential",
    fixedRegionCode: (map.get("fixed_region_code") as string) ?? null,
    analysisWindowDays: (map.get("analysis_window_days") as number) ?? DEFAULT_ANALYSIS_WINDOW_DAYS,
    minPerformanceScore:
      (map.get("min_performance_score") as number) ?? DEFAULT_MIN_PERFORMANCE_SCORE,
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
    duplicationAvoidanceDays:
      (map.get("duplication_avoidance_days") as number) ?? DEFAULT_DUPLICATION_AVOIDANCE_DAYS,
    maxKeywordsPerRegionPerDay:
      (map.get("max_keywords_per_region_per_day") as number) ?? DEFAULT_MAX_KEYWORDS_PER_DAY,
    minKeywordsPerRegionPerDay:
      (map.get("min_keywords_per_region_per_day") as number) ?? DEFAULT_MIN_KEYWORDS_PER_DAY,
    autoGenerateKeywords: (map.get("auto_generate_keywords") as boolean) ?? true,
    leadFinderBatchSize:
      (map.get("lead_finder_batch_size") as number) ?? DEFAULT_LEAD_FINDER_BATCH_SIZE,
    enableLeadFinderIntegration: (map.get("enable_lead_finder_integration") as boolean) ?? true,
    notificationOnFailure: (map.get("notification_on_failure") as boolean) ?? true,
  });
}

/**
 * Pure business logic for Keyword Pool.
 * No direct DB/I/O — fully testable in-memory.
 * Used by both API routes (with Supabase) and unit tests (with InMemory store).
 */
import { normalizeKeyword, isValidKeyword } from "./normalize";
import type {
  Keyword,
  KeywordSource,
  KeywordStatus,
  CreateKeywordInput,
  UpdateKeywordInput,
  DailyTargetInfo,
  NextKeywordResponse,
  KeywordUsage,
  UsageEventType,
} from "./types";

// Validation constants
export const DEFAULT_DAILY_TARGET = 100;
export const MIN_DAILY_TARGET = 1;
export const MAX_DAILY_TARGET = 10000;
export const MIN_PRIORITY = 1;
export const MAX_PRIORITY = 10;

export class KeywordValidationError extends Error {
  code = "VALIDATION_ERROR";
}
export class DuplicateKeywordError extends Error {
  code = "DUPLICATE_KEYWORD";
  constructor(public readonly normalized: string) {
    super(`Duplicate keyword: "${normalized}" already exists`);
  }
}
export class NotFoundError extends Error {
  code = "NOT_FOUND";
}

export function validateCreateInput(input: CreateKeywordInput) {
  if (!input.keyword || typeof input.keyword !== "string") {
    throw new KeywordValidationError("keyword is required");
  }
  if (!isValidKeyword(input.keyword)) {
    throw new KeywordValidationError("keyword must not be empty");
  }
  if (input.source !== "ai" && input.source !== "manual") {
    throw new KeywordValidationError("source must be 'ai' or 'manual'");
  }
  if (input.dailyTarget !== undefined) {
    if (
      !Number.isInteger(input.dailyTarget) ||
      input.dailyTarget < MIN_DAILY_TARGET ||
      input.dailyTarget > MAX_DAILY_TARGET
    ) {
      throw new KeywordValidationError(
        `dailyTarget must be integer ${MIN_DAILY_TARGET}-${MAX_DAILY_TARGET}`,
      );
    }
  }
  if (input.priority !== undefined) {
    if (
      !Number.isInteger(input.priority) ||
      input.priority < MIN_PRIORITY ||
      input.priority > MAX_PRIORITY
    ) {
      throw new KeywordValidationError(
        `priority must be integer ${MIN_PRIORITY}-${MAX_PRIORITY}`,
      );
    }
  }
  if (input.status !== undefined && !["active", "paused", "completed"].includes(input.status)) {
    throw new KeywordValidationError("status must be active/paused/completed");
  }
}

export function validateUpdateInput(input: UpdateKeywordInput) {
  if (input.keyword !== undefined) {
    if (typeof input.keyword !== "string" || !isValidKeyword(input.keyword)) {
      throw new KeywordValidationError("keyword must be a non-empty string");
    }
  }
  if (input.dailyTarget !== undefined) {
    if (
      !Number.isInteger(input.dailyTarget) ||
      input.dailyTarget < MIN_DAILY_TARGET ||
      input.dailyTarget > MAX_DAILY_TARGET
    ) {
      throw new KeywordValidationError(
        `dailyTarget must be integer ${MIN_DAILY_TARGET}-${MAX_DAILY_TARGET}`,
      );
    }
  }
  if (input.priority !== undefined) {
    if (
      !Number.isInteger(input.priority) ||
      input.priority < MIN_PRIORITY ||
      input.priority > MAX_PRIORITY
    ) {
      throw new KeywordValidationError(
        `priority must be integer ${MIN_PRIORITY}-${MAX_PRIORITY}`,
      );
    }
  }
  if (input.status !== undefined && !["active", "paused", "completed"].includes(input.status)) {
    throw new KeywordValidationError("status must be active/paused/completed");
  }
}

/**
 * Build a Keyword object from validated input.
 * ID/timestamps supplied by caller (store assigns those).
 */
export function buildKeyword(
  input: CreateKeywordInput,
  overrides: { id: string; nowIso: string },
): Keyword {
  validateCreateInput(input);
  const normalized = normalizeKeyword(input.keyword);
  return {
    id: overrides.id,
    keyword: input.keyword.trim().replace(/\s+/g, " "),
    normalizedKeyword: normalized,
    source: input.source,
    status: input.status ?? "active",
    dailyTarget: input.dailyTarget ?? DEFAULT_DAILY_TARGET,
    priority: input.priority ?? 5,
    createdAt: overrides.nowIso,
    lastUsedAt: null,
    totalSearches: 0,
    totalLeadsFound: 0,
    totalNewLeads: 0,
    totalDuplicates: 0,
    notes: input.notes ?? null,
  };
}

/**
 * Check duplicate among existing keywords.
 */
export function isDuplicate(
  existing: Keyword[],
  normalized: string,
  excludeId?: string,
): boolean {
  return existing.some(
    (k) => k.normalizedKeyword === normalized && k.id !== excludeId,
  );
}

/**
 * Apply update patch immutably.
 */
export function applyUpdate(existing: Keyword, patch: UpdateKeywordInput): Keyword {
  validateUpdateInput(patch);
  const next: Keyword = { ...existing };
  if (patch.keyword !== undefined) {
    const cleaned = patch.keyword.trim().replace(/\s+/g, " ");
    next.keyword = cleaned;
    next.normalizedKeyword = normalizeKeyword(cleaned);
  }
  if (patch.dailyTarget !== undefined) next.dailyTarget = patch.dailyTarget;
  if (patch.priority !== undefined) next.priority = patch.priority;
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.status !== undefined) next.status = patch.status as KeywordStatus;
  return next;
}

/**
 * Daily target helpers
 */
export function getTodayKey(date: Date = new Date()): string {
  // UTC date key YYYY-MM-DD
  return date.toISOString().slice(0, 10);
}

export function getDailyTargetInfo(
  keyword: Keyword,
  todaySearches: number,
): DailyTargetInfo {
  const remaining = Math.max(0, keyword.dailyTarget - todaySearches);
  return {
    keywordId: keyword.id,
    keyword: keyword.keyword,
    dailyTarget: keyword.dailyTarget,
    todaySearches,
    remaining,
    reached: todaySearches >= keyword.dailyTarget,
  };
}

export function hasReachedDailyTarget(
  keyword: Keyword,
  todaySearches: number,
): boolean {
  return todaySearches >= keyword.dailyTarget;
}

/**
 * Next active keyword selection.
 * Priority: lower number = higher priority.
 * Among active keywords whose daily target NOT reached, pick:
 *   1) smallest priority
 *   2) earliest lastUsedAt (nulls first — least recently used)
 *   3) earliest createdAt
 * Returns null if no eligible keyword.
 *
 * @param keywords - all keywords
 * @param todayCounts - map keywordId -> today's search_started/completed count
 */
export function selectNextActiveKeyword(
  keywords: Keyword[],
  todayCounts: Map<string, number>,
): Keyword | null {
  const eligible = keywords.filter((k) => {
    if (k.status !== "active") return false;
    const c = todayCounts.get(k.id) ?? 0;
    return c < k.dailyTarget;
  });
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aLast = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bLast = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    // null/oldest first. 0 represents never-used (null) which sorts first.
    // If both null (0), keep order by createdAt.
    if (aLast !== bLast) return aLast - bLast;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return eligible[0];
}

export function toNextKeywordResponse(k: Keyword): NextKeywordResponse {
  return {
    id: k.id,
    keyword: k.keyword,
    normalizedKeyword: k.normalizedKeyword,
    source: k.source,
    dailyTarget: k.dailyTarget,
    priority: k.priority,
  };
}

/**
 * Totally public helper for automation: shape required by spec
 * { keyword, source, dailyTarget, priority }
 */
export function toAutomationPayload(k: Keyword) {
  return {
    keyword: k.keyword,
    source: k.source,
    dailyTarget: k.dailyTarget,
    priority: k.priority,
  };
}

/**
 * Usage tracking: build a usage log entry and apply counters to keyword.
 * Pure function: returns { nextKeyword, usage }
 */
export function recordUsage(
  keyword: Keyword,
  event: {
    eventType: UsageEventType;
    leadsFound?: number;
    newLeads?: number;
    duplicates?: number;
    errorMessage?: string | null;
    nowIso: string;
    id: string;
  },
): { keyword: Keyword; usage: KeywordUsage } {
  const usage: KeywordUsage = {
    id: event.id,
    keywordId: keyword.id,
    keyword: keyword.keyword,
    eventType: event.eventType,
    leadsFound: event.leadsFound ?? 0,
    newLeads: event.newLeads ?? 0,
    duplicates: event.duplicates ?? 0,
    errorMessage: event.errorMessage ?? null,
    createdAt: event.nowIso,
  };

  const nextKeyword: Keyword = { ...keyword };

  if (event.eventType === "search_started") {
    nextKeyword.totalSearches += 1;
    nextKeyword.lastUsedAt = event.nowIso;
  } else if (event.eventType === "search_completed") {
    // search_completed also counts as a search if not already counted via started
    // For n8n flow where only completed is sent, increment here.
    // If both started+completed are sent, the caller should send started increment only once.
    // We add a guard: increment only if we track separately — but for simplicity we increment
    // totalSearches on completed as well only if caller signals increment.
    // Current behavior: started increments, completed increments leads counters only.
    // To support either flow, we let completed increment totalSearches only when started not used.
    // Pure logic: completed always updates leads, never double-counts searches unless explicitly.
    // For Phase 1 we treat completed as NOT incrementing totalSearches (started does).
    // But we still bump lastUsedAt.
    nextKeyword.lastUsedAt = event.nowIso;
    nextKeyword.totalLeadsFound += event.leadsFound ?? 0;
    nextKeyword.totalNewLeads += event.newLeads ?? 0;
    nextKeyword.totalDuplicates += event.duplicates ?? 0;
    // If caller only uses search_completed (no search_started), they can include leads and we should also count search
    // We detect via totalSearches: caller can set event increment outside. For now keep completed not counting search,
    // and expose helper `recordSearchCompletedWithCount` if needed.
  } else if (event.eventType === "failed_search") {
    nextKeyword.lastUsedAt = event.nowIso;
    // no counter increments except lastUsedAt
  }

  // For the common Phase 1 flow where Lead Finder calls search_completed with leads,
  // we also need to ensure totalSearches increments if search_started wasn't called.
  // The store layer will handle that by checking recent logs. Pure service keeps rule simple:
  // allow caller to decide. We provide alternative helper below.

  return { keyword: nextKeyword, usage };
}

/**
 * Helper for flows that only emit search_completed (counts as one search + leads)
 */
export function recordSearchCompletedWithCount(
  keyword: Keyword,
  event: {
    leadsFound?: number;
    newLeads?: number;
    duplicates?: number;
    nowIso: string;
    id: string;
  },
): { keyword: Keyword; usage: KeywordUsage } {
  const { keyword: k1, usage } = recordUsage(keyword, {
    eventType: "search_completed",
    leadsFound: event.leadsFound,
    newLeads: event.newLeads,
    duplicates: event.duplicates,
    nowIso: event.nowIso,
    id: event.id,
  });
  // Also count this as a search
  k1.totalSearches += 1;
  return { keyword: k1, usage: { ...usage, eventType: "search_completed" } };
}

// ── Helpers for bulk AI/manual insertion ──

export function filterNewKeywords(
  candidates: string[],
  existing: Keyword[],
  source: KeywordSource = "ai",
): { toInsert: CreateKeywordInput[]; duplicates: string[] } {
  const existingNorms = new Set(existing.map((k) => k.normalizedKeyword));
  const seen = new Set<string>();
  const toInsert: CreateKeywordInput[] = [];
  const duplicates: string[] = [];
  for (const raw of candidates) {
    const norm = normalizeKeyword(raw);
    if (!norm) continue;
    if (existingNorms.has(norm) || seen.has(norm)) {
      duplicates.push(raw);
      continue;
    }
    seen.add(norm);
    toInsert.push({ keyword: raw, source });
  }
  return { toInsert, duplicates };
}

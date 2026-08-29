/**
 * Task integration for Keyword Pool.
 * Phase 1: architecture only — exposes helpers so a future task like
 * "Daily Lead Generation" can consume AI + manual keywords from the same pool.
 *
 * Tasks remain independent; this module provides the bridge without
 * mutating existing TASKS data or breaking the Tasks UI.
 */

import type { Keyword } from "./types";
import { selectNextActiveKeyword } from "./service";
import type { KeywordStore } from "./store";

export interface DailyLeadGenTaskContext {
  taskId: string;
  title: string; // e.g. "Daily Lead Generation"
  keywords: Keyword[]; // resolved active pool for this run
  nextKeyword: Keyword | null;
}

/**
 * Resolve keywords for a task that requires lead generation.
 * - Fetches all keywords from store
 * - Filters active + under daily target
 * - Returns sorted eligible set + next keyword for n8n to consume
 */
export async function resolveKeywordsForTask(
  store: KeywordStore,
  taskId: string,
  taskTitle = "Daily Lead Generation",
): Promise<DailyLeadGenTaskContext> {
  const all = await store.list();
  const todayCounts = await store.getTodayCounts(new Date());
  const eligible = all.filter((k) => {
    if (k.status !== "active") return false;
    const c = todayCounts.get(k.id) ?? 0;
    return c < k.dailyTarget;
  });
  // Sort by priority → lastUsedAt → createdAt (same as selectNextActiveKeyword)
  eligible.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aLast = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bLast = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    if (aLast !== bLast) return aLast - bLast;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  const nextKeyword = selectNextActiveKeyword(all, todayCounts);
  return { taskId, title: taskTitle, keywords: eligible, nextKeyword };
}

/**
 * Convenience: check if the daily lead gen task is blocked (no eligible keywords).
 */
export function isLeadGenBlocked(ctx: DailyLeadGenTaskContext): boolean {
  return ctx.nextKeyword === null;
}

/**
 * Describe pool composition for a task run (useful for logging / UI).
 */
export function describePoolForTask(ctx: DailyLeadGenTaskContext): string {
  const ai = ctx.keywords.filter((k) => k.source === "ai").length;
  const manual = ctx.keywords.filter((k) => k.source === "manual").length;
  return `Task "${ctx.title}" — ${ctx.keywords.length} eligible (${ai} AI, ${manual} manual). Next: ${ctx.nextKeyword?.keyword ?? "none"}`;
}

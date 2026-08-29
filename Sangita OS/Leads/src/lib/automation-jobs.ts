/**
 * Job store for Lead Finder automation.
 * Persists to Postgres app_kv if DATABASE_URL exists, otherwise to data/automation-jobs.json,
 * with in-memory cache for speed and idempotency.
 *
 * Statuses: pending → running → completed | failed
 * No secrets stored.
 */
import { hasDatabaseUrl, getDbValue, setDbValue } from "@/lib/db";
import { readLeadsFile, updateJsonFile } from "@/lib/storage";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface AutomationJob {
  jobId: string;
  keyword: string;
  normalizedKeyword: string;
  filters?: {
    minSubscribers?: number;
    maxSubscribers?: number;
    country?: string;
    keywordFilter?: string;
    channelAge?: "any" | "under1" | "oneToThree" | "threeToFive" | "overFive";
    sortBy?: "subscribers" | "views" | "videos";
  };
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  leadsFound: number;
  newLeads: number;
  duplicates: number;
  totalFound?: number; // alias for leadsFound
  errorMessage?: string;
  idempotencyKey: string; // normalizedKeyword + filters hash
}

const JOBS_FILE = "automation-jobs.json";
const DB_KEY = "automation_jobs";
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000; // 5 min window for duplicate prevention

// In-memory cache (per-process)
const memoryCache = new Map<string, AutomationJob>();
let memoryLoaded = false;

function normalizeKeywordForIdempotency(keyword: string): string {
  return keyword.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildIdempotencyKey(keyword: string, filters?: AutomationJob["filters"]): string {
  const norm = normalizeKeywordForIdempotency(keyword);
  const f = filters ? JSON.stringify(filters) : "";
  return `${norm}::${f}`;
}

async function loadAll(): Promise<Map<string, AutomationJob>> {
  if (memoryLoaded) return memoryCache;

  if (hasDatabaseUrl()) {
    try {
      const stored = await getDbValue<Record<string, AutomationJob>>(DB_KEY, {});
      for (const [k, v] of Object.entries(stored)) memoryCache.set(k, v);
      memoryLoaded = true;
      return memoryCache;
    } catch {
      memoryLoaded = true;
      return memoryCache;
    }
  }

  // File fallback
  if (process.env.NODE_ENV === "production" && !hasDatabaseUrl()) {
    memoryLoaded = true;
    return memoryCache;
  }
  try {
    const arr = await readLeadsFile<AutomationJob[]>(JOBS_FILE, []);
    for (const j of arr) memoryCache.set(j.jobId, j);
  } catch {
    // ignore
  }
  memoryLoaded = true;
  return memoryCache;
}

async function persistAll(): Promise<void> {
  if (hasDatabaseUrl()) {
    const obj: Record<string, AutomationJob> = {};
    for (const [k, v] of memoryCache) obj[k] = v;
    // keep only last 500 jobs to avoid bloat
    const sorted = Array.from(memoryCache.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    const trimmed: Record<string, AutomationJob> = {};
    for (const j of sorted.slice(0, 500)) trimmed[j.jobId] = j;
    // if trimmed smaller, sync cache
    if (Object.keys(trimmed).length !== memoryCache.size) {
      memoryCache.clear();
      for (const [k, v] of Object.entries(trimmed)) memoryCache.set(k, v);
    }
    await setDbValue(DB_KEY, trimmed);
    return;
  }

  if (process.env.NODE_ENV === "production" && !hasDatabaseUrl()) return;
  const arr = Array.from(memoryCache.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  ).slice(0, 500);
  await updateJsonFile<AutomationJob[]>(
    JOBS_FILE,
    async () => arr,
    [],
  );
}

export async function createJob(input: {
  keyword: string;
  filters?: AutomationJob["filters"];
}): Promise<AutomationJob> {
  const keyword = input.keyword.trim().replace(/\s+/g, " ");
  if (!keyword) throw new Error("keyword is required");
  const normalized = normalizeKeywordForIdempotency(keyword);
  const idempotencyKey = buildIdempotencyKey(keyword, input.filters);
  await loadAll();

  // Idempotency: if running/pending job for same key within window, return it
  const now = Date.now();
  for (const job of memoryCache.values()) {
    if (
      job.idempotencyKey === idempotencyKey &&
      (job.status === "pending" || job.status === "running") &&
      now - new Date(job.createdAt).getTime() < IDEMPOTENCY_WINDOW_MS
    ) {
      return job;
    }
  }

  const nowIso = new Date().toISOString();
  const job: AutomationJob = {
    jobId: crypto.randomUUID(),
    keyword,
    normalizedKeyword: normalized,
    filters: input.filters,
    status: "pending",
    createdAt: nowIso,
    updatedAt: nowIso,
    leadsFound: 0,
    newLeads: 0,
    duplicates: 0,
    idempotencyKey,
  };
  memoryCache.set(job.jobId, job);
  await persistAll();
  return job;
}

export async function getJob(jobId: string): Promise<AutomationJob | null> {
  await loadAll();
  return memoryCache.get(jobId) ?? null;
}

export async function updateJob(jobId: string, patch: Partial<AutomationJob>): Promise<AutomationJob | null> {
  await loadAll();
  const existing = memoryCache.get(jobId);
  if (!existing) return null;
  const updated: AutomationJob = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  memoryCache.set(jobId, updated);
  await persistAll();
  return updated;
}

export async function findRunningByKeyword(keyword: string): Promise<AutomationJob | null> {
  const norm = normalizeKeywordForIdempotency(keyword);
  await loadAll();
  const now = Date.now();
  for (const job of memoryCache.values()) {
    if (
      job.normalizedKeyword === norm &&
      (job.status === "pending" || job.status === "running") &&
      now - new Date(job.createdAt).getTime() < IDEMPOTENCY_WINDOW_MS
    ) {
      return job;
    }
  }
  return null;
}

export async function listJobs(limit = 50): Promise<AutomationJob[]> {
  await loadAll();
  return Array.from(memoryCache.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// For tests: reset
export async function _clearJobsForTests(): Promise<void> {
  memoryCache.clear();
  memoryLoaded = false;
  if (hasDatabaseUrl()) {
    try {
      await setDbValue(DB_KEY, {});
    } catch {}
    memoryLoaded = true;
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    try {
      await updateJsonFile<AutomationJob[]>(JOBS_FILE, async () => [], []);
    } catch {}
  }
  memoryLoaded = true;
}

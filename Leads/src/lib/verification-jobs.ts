/**
 * Verification jobs — similar to automation-jobs but for email verification batch.
 * Stores pending/running/completed/failed with counts per status.
 */
import { hasDatabaseUrl, getDbValue, setDbValue } from "@/lib/db";
import { readLeadsFile, updateJsonFile } from "@/lib/storage";
import type { EmailVerificationStatus } from "@/lib/types";

export type VerifyJobStatus = "pending" | "running" | "completed" | "failed";

export interface VerificationJob {
  jobId: string;
  leadIds: string[]; // channelIds
  status: VerifyJobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  total: number;
  valid: number;
  invalid: number;
  risky: number;
  unknown: number;
  not_verified: number;
  errorMessage?: string;
  idempotencyKey: string;
}

const JOBS_FILE = "verification-jobs.json";
const DB_KEY = "verification_jobs";
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

const memoryCache = new Map<string, VerificationJob>();
let memoryLoaded = false;

function buildIdempotencyKey(leadIds: string[]): string {
  return [...leadIds].sort().join(",");
}

async function loadAll(): Promise<Map<string, VerificationJob>> {
  if (memoryLoaded) return memoryCache;
  if (hasDatabaseUrl()) {
    try {
      const stored = await getDbValue<Record<string, VerificationJob>>(DB_KEY, {});
      for (const [k, v] of Object.entries(stored)) memoryCache.set(k, v);
    } catch {}
    memoryLoaded = true;
    return memoryCache;
  }
  if (process.env.NODE_ENV === "production" && !hasDatabaseUrl()) {
    memoryLoaded = true;
    return memoryCache;
  }
  try {
    const arr = await readLeadsFile<VerificationJob[]>(JOBS_FILE, []);
    for (const j of arr) memoryCache.set(j.jobId, j);
  } catch {}
  memoryLoaded = true;
  return memoryCache;
}

async function persistAll(): Promise<void> {
  if (hasDatabaseUrl()) {
    const obj: Record<string, VerificationJob> = {};
    const sorted = Array.from(memoryCache.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 500);
    memoryCache.clear();
    for (const j of sorted) {
      obj[j.jobId] = j;
      memoryCache.set(j.jobId, j);
    }
    await setDbValue(DB_KEY, obj);
    return;
  }
  if (process.env.NODE_ENV === "production" && !hasDatabaseUrl()) return;
  const arr = Array.from(memoryCache.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 500);
  await updateJsonFile<VerificationJob[]>(JOBS_FILE, async () => arr, []);
}

export async function createVerifyJob(leadIds: string[]): Promise<VerificationJob> {
  const normalized = [...new Set(leadIds.map((s) => s.trim()).filter(Boolean))];
  if (normalized.length === 0) throw new Error("leadIds is required");
  if (normalized.length > 500) throw new Error("Batch too large (max 500)");
  const idempotencyKey = buildIdempotencyKey(normalized);
  await loadAll();
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
  const job: VerificationJob = {
    jobId: `verify_${crypto.randomUUID()}`,
    leadIds: normalized,
    status: "pending",
    createdAt: nowIso,
    updatedAt: nowIso,
    total: normalized.length,
    valid: 0,
    invalid: 0,
    risky: 0,
    unknown: 0,
    not_verified: normalized.length,
    idempotencyKey,
  };
  memoryCache.set(job.jobId, job);
  await persistAll();
  return job;
}

export async function getVerifyJob(jobId: string): Promise<VerificationJob | null> {
  await loadAll();
  return memoryCache.get(jobId) ?? null;
}

export async function updateVerifyJob(jobId: string, patch: Partial<VerificationJob>): Promise<VerificationJob | null> {
  await loadAll();
  const existing = memoryCache.get(jobId);
  if (!existing) return null;
  const updated: VerificationJob = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  memoryCache.set(jobId, updated);
  await persistAll();
  return updated;
}

export async function _clearVerifyJobsForTests(): Promise<void> {
  memoryCache.clear();
  memoryLoaded = false;
  if (hasDatabaseUrl()) {
    try { await setDbValue(DB_KEY, {}); } catch {}
    memoryLoaded = true;
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    try { await updateJsonFile<VerificationJob[]>(JOBS_FILE, async () => [], []); } catch {}
  }
  memoryLoaded = true;
}

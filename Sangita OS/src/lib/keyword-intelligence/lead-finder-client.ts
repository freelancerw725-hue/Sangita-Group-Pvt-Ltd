/**
 * Lead Finder Integration Client for Keyword Intelligence Engine.
 * Sends selected daily keywords to Lead Finder's automation API.
 * Server-only — never expose secrets to browser.
 */

import type { LeadFinderKeywordPayload } from "./service";

// ============================================================
// TYPES
// ============================================================

export interface LeadFinderJobResponse {
  jobId: string;
  idempotencyKey: string;
  keyword: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
}

export interface LeadFinderBatchResponse {
  jobs: LeadFinderJobResponse[];
  totalSubmitted: number;
  failed: Array<{ keyword: string; error: string }>;
}

export interface LeadFinderStats {
  generatedAt: string;
  totalLeads: number;
  todayLeads: number;
  newLeads: number;
  verification: {
    valid: number;
    invalid: number;
    risky: number;
    unknown: number;
    not_verified: number;
  };
  approval: {
    pending_review: number;
    approved: number;
    rejected: number;
  };
  sheets: {
    total: number;
    ready: number;
    draft: number;
  };
  history: Array<{
    id: string;
    searchKeyword: string;
    searchedAt: string;
    totalLeadsFound: number;
  }>;
}

// ============================================================
// CONFIG
// ============================================================

function getLeadFinderConfig() {
  const base =
    process.env.LEAD_FINDER_BASE_URL?.trim() ||
    process.env.LEAD_FINDER_URL?.trim() ||
    "https://sangita-lead-finder.vercel.app";
  const key =
    process.env.LEAD_FINDER_API_KEY?.trim() ||
    process.env.LEAD_FINDER_AUTOMATION_KEY?.trim() ||
    process.env.AUTOMATION_API_KEY?.trim() ||
    "";
  return { base: base.replace(/\/$/, ""), key };
}

// ============================================================
// IDEMPOTENCY KEY GENERATION
// ============================================================

/**
 * Generate deterministic idempotency key for a keyword + date combination.
 * Prevents duplicate job creation if the same keyword is sent multiple times.
 */
export function generateIdempotencyKey(keyword: string, date: string, runId: string): string {
  const normalized = keyword.toLowerCase().trim().replace(/\s+/g, "-");
  const shortRunId = runId.slice(0, 8);
  return `ki-${normalized}-${date}-${shortRunId}`;
}

// ============================================================
// CORE API CALLS
// ============================================================

/**
 * Submit a single keyword to Lead Finder automation queue.
 * Returns the job ID for tracking.
 */
export async function submitKeywordToLeadFinder(
  payload: LeadFinderKeywordPayload,
  idempotencyKey: string,
): Promise<LeadFinderJobResponse> {
  const { base, key } = getLeadFinderConfig();
  if (!base) throw new Error("LEAD_FINDER_BASE_URL not configured");

  const url = `${base}/api/automation/keywords`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (key) headers["x-api-key"] = key;

  const body = {
    keyword: payload.keyword,
    source: payload.source,
    dailyTarget: payload.dailyTarget,
    priority: payload.priority,
    filters: {
      regionCode: payload.regionCode,
      regionName: payload.regionName,
    },
    idempotencyKey,
    metadata: {
      runId: payload.runId,
      selectionReason: payload.selectionReason,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    // No cache - this is a mutating operation
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`Lead Finder API error (${res.status}): ${errorText}`);
  }

  const data = await res.json().catch(() => ({}));
  return {
    jobId: data.jobId || data.id || "",
    idempotencyKey,
    keyword: payload.keyword,
    status: data.status || "pending",
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

/**
 * Submit multiple keywords in batch to Lead Finder.
 * Processes in parallel with concurrency limit.
 */
export async function submitKeywordsBatchToLeadFinder(
  payloads: LeadFinderKeywordPayload[],
  runId: string,
  date: string,
  concurrency = 5,
): Promise<LeadFinderBatchResponse> {
  const results: LeadFinderJobResponse[] = [];
  const failed: Array<{ keyword: string; error: string }> = [];

  // Process in batches with concurrency limit
  for (let i = 0; i < payloads.length; i += concurrency) {
    const batch = payloads.slice(i, i + concurrency);
    const promises = batch.map(async (payload) => {
      const idempotencyKey = generateIdempotencyKey(payload.keyword, date, runId);
      try {
        const job = await submitKeywordToLeadFinder(payload, idempotencyKey);
        return { success: true as const, job };
      } catch (error) {
        return {
          success: false as const,
          keyword: payload.keyword,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      if (result.success) {
        results.push(result.job);
      } else {
        failed.push({ keyword: result.keyword, error: result.error });
      }
    }
  }

  return {
    jobs: results,
    totalSubmitted: results.length,
    failed,
  };
}

/**
 * Check status of Lead Finder automation jobs.
 */
export async function checkLeadFinderJobStatus(
  jobIds: string[],
): Promise<Map<string, LeadFinderJobResponse>> {
  const { base, key } = getLeadFinderConfig();
  if (!base || jobIds.length === 0) return new Map();

  const results = new Map<string, LeadFinderJobResponse>();

  // Check in batches
  for (const jobId of jobIds) {
    try {
      const url = `${base}/api/automation/jobs/${jobId}`;
      const headers: Record<string, string> = {};
      if (key) headers["x-api-key"] = key;

      const res = await fetch(url, { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        results.set(jobId, {
          jobId,
          idempotencyKey: data.idempotencyKey || "",
          keyword: data.keyword || "",
          status: data.status || "unknown",
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }
    } catch {
      // Ignore individual failures
    }
  }

  return results;
}

/**
 * Fetch Lead Finder stats for dashboard/monitoring.
 */
export async function fetchLeadFinderStats(): Promise<LeadFinderStats | null> {
  const { base, key } = getLeadFinderConfig();
  if (!base) return null;

  const url = `${base}/api/automation/stats`;
  const headers: Record<string, string> = {};
  if (key) headers["x-api-key"] = key;

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

/**
 * Trigger Lead Finder search for a specific keyword (legacy/single endpoint).
 * Some Lead Finder deployments may use /api/automation/search instead.
 */
export async function triggerLeadFinderSearch(
  keyword: string,
  options: {
    source?: "ai" | "manual";
    dailyTarget?: number;
    priority?: number;
    filters?: Record<string, unknown>;
    idempotencyKey?: string;
  } = {},
): Promise<LeadFinderJobResponse> {
  const { base, key } = getLeadFinderConfig();
  if (!base) throw new Error("LEAD_FINDER_BASE_URL not configured");

  const url = `${base}/api/automation/search`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers["x-api-key"] = key;

  const idempotencyKey =
    options.idempotencyKey ||
    generateIdempotencyKey(keyword, new Date().toISOString().split("T")[0], "manual");

  const body = {
    keyword,
    source: options.source || "manual",
    dailyTarget: options.dailyTarget || 100,
    priority: options.priority || 5,
    filters: options.filters || {},
    idempotencyKey,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`Lead Finder search API error (${res.status}): ${errorText}`);
  }

  const data = await res.json().catch(() => ({}));
  return {
    jobId: data.jobId || data.id || "",
    idempotencyKey,
    keyword,
    status: data.status || "pending",
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

// ============================================================
// HIGH-LEVEL ORCHESTRATION
// ============================================================

export interface SubmitDailyKeywordsOptions {
  payloads: LeadFinderKeywordPayload[];
  runId: string;
  date: string;
  batchSize?: number;
  onProgress?: (completed: number, total: number) => void;
}

export interface SubmitDailyKeywordsResult {
  success: boolean;
  runId: string;
  totalSubmitted: number;
  totalFailed: number;
  jobs: LeadFinderJobResponse[];
  failed: Array<{ keyword: string; error: string }>;
  submittedAt: string;
}

/**
 * Submit all daily keywords to Lead Finder with progress tracking.
 * This is the main entry point for the daily automation cron.
 */
export async function submitDailyKeywordsToLeadFinder(
  options: SubmitDailyKeywordsOptions,
): Promise<SubmitDailyKeywordsResult> {
  const { payloads, runId, date, batchSize = 10, onProgress } = options;

  if (payloads.length === 0) {
    return {
      success: true,
      runId,
      totalSubmitted: 0,
      totalFailed: 0,
      jobs: [],
      failed: [],
      submittedAt: new Date().toISOString(),
    };
  }

  const allJobs: LeadFinderJobResponse[] = [];
  const allFailed: Array<{ keyword: string; error: string }> = [];
  let completed = 0;

  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const result = await submitKeywordsBatchToLeadFinder(batch, runId, date, batchSize);

    allJobs.push(...result.jobs);
    allFailed.push(...result.failed);

    completed += batch.length;
    onProgress?.(completed, payloads.length);
  }

  return {
    success: allFailed.length === 0,
    runId,
    totalSubmitted: allJobs.length,
    totalFailed: allFailed.length,
    jobs: allJobs,
    failed: allFailed,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Wait for Lead Finder jobs to complete (polling).
 * Useful for synchronous workflows or testing.
 */
export async function waitForLeadFinderJobs(
  jobIds: string[],
  options: {
    pollIntervalMs?: number;
    timeoutMs?: number;
    onProgress?: (completed: number, total: number, statuses: Map<string, string>) => void;
  } = {},
): Promise<Map<string, LeadFinderJobResponse>> {
  const { pollIntervalMs = 5000, timeoutMs = 300000, onProgress } = options;
  const startTime = Date.now();
  const results = new Map<string, LeadFinderJobResponse>();
  const pending = new Set(jobIds);

  while (pending.size > 0 && Date.now() - startTime < timeoutMs) {
    const statuses = await checkLeadFinderJobStatus([...pending]);

    for (const [jobId, status] of statuses.entries()) {
      if (status.status === "completed" || status.status === "failed") {
        results.set(jobId, status);
        pending.delete(jobId);
      }
    }

    onProgress?.(
      jobIds.length - pending.size,
      jobIds.length,
      new Map([...statuses].map(([k, v]) => [k, v.status])),
    );

    if (pending.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  // Add any remaining as timed out
  for (const jobId of pending) {
    results.set(jobId, {
      jobId,
      idempotencyKey: "",
      keyword: "",
      status: "failed",
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}

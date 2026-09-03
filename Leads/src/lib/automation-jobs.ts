import { createSupabaseAdmin } from "@/lib/supabase/client"

export type JobStatus = "pending" | "running" | "completed" | "failed"

export interface AutomationJob {
  jobId: string
  keyword: string
  normalizedKeyword: string
  filters?: {
    minSubscribers?: number
    maxSubscribers?: number
    country?: string
    keywordFilter?: string
    channelAge?: "any" | "under1" | "oneToThree" | "threeToFive" | "overFive"
    sortBy?: "subscribers" | "views" | "videos"
  }
  status: JobStatus
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  leadsFound: number
  newLeads: number
  duplicates: number
  totalFound?: number
  errorMessage?: string
  idempotencyKey: string
  newLeadIds?: string[]
}

const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000

function normalizeKeywordForIdempotency(keyword: string): string {
  return keyword.trim().toLowerCase().replace(/\s+/g, " ")
}

function buildIdempotencyKey(keyword: string, filters?: AutomationJob["filters"]): string {
  const norm = normalizeKeywordForIdempotency(keyword)
  const f = filters ? JSON.stringify(filters) : ""
  return `${norm}::${f}`
}

function getAdmin() {
  return createSupabaseAdmin()
}

async function loadAll() {
  const admin = getAdmin()
  const { data, error } = await admin.from("automation_jobs").select("*").order("created_at", { ascending: false }).limit(500)
  if (error) throw error
  return (data as AutomationJob[]) ?? []
}

async function persistAll(jobs: AutomationJob[]) {
  const admin = getAdmin()
  for (const job of jobs.slice(0, 500)) {
    const { error } = await admin.from("automation_jobs").upsert(job, { onConflict: "jobId" })
    if (error) throw error
  }
}

export async function createJob(input: {
  keyword: string
  filters?: AutomationJob["filters"]
}): Promise<AutomationJob> {
  const keyword = input.keyword.trim().replace(/\s+/g, " ")
  if (!keyword) throw new Error("keyword is required")

  const normalized = normalizeKeywordForIdempotency(keyword)
  const idempotencyKey = buildIdempotencyKey(keyword, input.filters)

  const jobs = await loadAll()
  const now = Date.now()

  for (const job of jobs) {
    if (
      job.idempotencyKey === idempotencyKey &&
      (job.status === "pending" || job.status === "running") &&
      now - new Date(job.createdAt).getTime() < IDEMPOTENCY_WINDOW_MS
    ) {
      return job
    }
  }

  const nowIso = new Date().toISOString()
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
  }

  jobs.push(job)
  await persistAll(jobs)
  return job
}

export async function getJob(jobId: string): Promise<AutomationJob | null> {
  const admin = getAdmin()
  const { data, error } = await admin.from("automation_jobs").select("*").eq("jobId", jobId).maybeSingle()
  if (error) throw error
  return (data as AutomationJob) ?? null
}

export async function updateJob(jobId: string, patch: Partial<AutomationJob>): Promise<AutomationJob | null> {
  const admin = getAdmin()
  const { data, error } = await admin
    .from("automation_jobs")
    .update({ ...patch, updatedAt: new Date().toISOString() })
    .eq("jobId", jobId)
    .select()
    .maybeSingle()
  if (error) throw error
  return (data as AutomationJob) ?? null
}

export async function findRunningByKeyword(keyword: string): Promise<AutomationJob | null> {
  const norm = normalizeKeywordForIdempotency(keyword)
  const admin = getAdmin()
  const { data, error } = await admin
    .from("automation_jobs")
    .select("*")
    .eq("normalizedKeyword", norm)
    .in("status", ["pending", "running"])
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as AutomationJob) ?? null
}

export async function listJobs(limit = 50): Promise<AutomationJob[]> {
  const admin = getAdmin()
  const { data, error } = await admin.from("automation_jobs").select("*").order("created_at", { ascending: false }).limit(limit)
  if (error) throw error
  return (data as AutomationJob[]) ?? []
}

export async function _clearJobsForTests(): Promise<void> {
  const admin = getAdmin()
  await admin.from("automation_jobs").delete().neq("jobId", "00000000-0000-0000-0000-000000000000")
}
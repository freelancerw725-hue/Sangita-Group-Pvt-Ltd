import { createSupabaseAdmin } from "@/lib/supabase/client"

export type VerificationJobStatus = "pending" | "running" | "completed" | "failed"

export interface VerificationJob {
  jobId: string
  leadIds: string[]
  status: VerificationJobStatus
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  total: number
  valid: number
  invalid: number
  risky: number
  unknown: number
  not_verified: number
  errorMessage?: string
}

function getAdmin() {
  return createSupabaseAdmin()
}

export async function createVerifyJob(leadIds: string[]): Promise<VerificationJob> {
  const admin = getAdmin()
  const nowIso = new Date().toISOString()
  const job: VerificationJob = {
    jobId: crypto.randomUUID(),
    leadIds,
    status: "pending",
    createdAt: nowIso,
    updatedAt: nowIso,
    total: leadIds.length,
    valid: 0,
    invalid: 0,
    risky: 0,
    unknown: 0,
    not_verified: 0,
  }

  const { error } = await admin.from("verification_jobs").insert(job)
  if (error) throw error
  return job
}

export async function getVerifyJob(jobId: string): Promise<VerificationJob | null> {
  const admin = getAdmin()
  const { data, error } = await admin.from("verification_jobs").select("*").eq("jobId", jobId).maybeSingle()
  if (error) throw error
  return (data as VerificationJob) ?? null
}

export async function updateVerifyJob(jobId: string, patch: Partial<VerificationJob>): Promise<VerificationJob | null> {
  const admin = getAdmin()
  const { data, error } = await admin
    .from("verification_jobs")
    .update({ ...patch, updatedAt: new Date().toISOString() })
    .eq("jobId", jobId)
    .select()
    .maybeSingle()
  if (error) throw error
  return (data as VerificationJob) ?? null
}

export async function listVerifyJobs(limit = 50): Promise<VerificationJob[]> {
  const admin = getAdmin()
  const { data, error } = await admin.from("verification_jobs").select("*").order("created_at", { ascending: false }).limit(limit)
  if (error) throw error
  return (data as VerificationJob[]) ?? []
}

export async function _clearVerifyJobsForTests(): Promise<void> {
  const admin = getAdmin()
  await admin.from("verification_jobs").delete().neq("jobId", "00000000-0000-0000-0000-000000000000")
}
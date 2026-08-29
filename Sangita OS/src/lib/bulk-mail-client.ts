/**
 * Server-only Bulk Mail client for Sangita OS dashboard.
 * Never expose BULK_MAIL_API_KEY to frontend.
 */

export interface BulkMailProgress {
  campaignId: number
  id: number
  name: string
  status: string
  runStatus: string
  legacyStatus: string
  progress: {
    total: number
    pending: number
    processing: number
    sent: number
    failed: number
    retry: number
    cancelled: number
    progress: number
  }
  dailyLimit: number
  todaySent: number
  remainingToday: number
  percentComplete: number
  senderAccountId?: number
  senderName?: string | null
  senderEmail?: string | null
}

function getBulkMailConfig() {
  const base = process.env.BULK_MAIL_BASE_URL?.trim() || process.env.BULK_MAIL_URL?.trim() || process.env.APP_URL?.trim() || "http://localhost:3001"
  const key = process.env.BULK_MAIL_API_KEY?.trim() || process.env.BULK_MAIL_CAMPAIGN_KEY?.trim() || process.env.BULK_MAIL_IMPORT_KEY?.trim() || ""
  return { base: base.replace(/\/$/, ""), key }
}

export async function fetchBulkMailCampaigns(): Promise<Array<{ id: number; name: string; status: string }>> {
  const { base, key } = getBulkMailConfig()
  try {
    const headers: Record<string, string> = {}
    if (key) headers["x-api-key"] = key
    const res = await fetch(`${base}/api/campaigns`, { headers, cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json().catch(() => ({}))
    const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
    return list.map((c: any) => ({ id: Number(c.id), name: String(c.name), status: String(c.status) }))
  } catch {
    return []
  }
}

export async function fetchBulkMailProgress(campaignId: number): Promise<BulkMailProgress | null> {
  const { base, key } = getBulkMailConfig()
  try {
    const headers: Record<string, string> = {}
    if (key) headers["x-api-key"] = key
    const res = await fetch(`${base}/api/campaigns/${campaignId}/progress`, { headers, cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    // Bulk Mail returns { campaignId, status, runStatus, progress, dailyLimit, todaySent, remainingToday, percentComplete } or wrapped
    if (data && typeof data.campaignId === "number") return data as BulkMailProgress
    if (data && data.progress) return data as BulkMailProgress
    return null
  } catch {
    return null
  }
}

export async function controlBulkMailCampaign(campaignId: number, action: "pause" | "resume" | "cancel" | "start"): Promise<boolean> {
  const { base, key } = getBulkMailConfig()
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (key) headers["x-api-key"] = key
    const res = await fetch(`${base}/api/campaigns/${campaignId}/${action}`, {
      method: "POST",
      headers,
      body: action === "start" || action === "resume" ? JSON.stringify({}) : undefined,
    })
    return res.ok
  } catch {
    return false
  }
}

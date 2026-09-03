import { getSupabaseAdmin } from "@/lib/supabase/client"
import type { LeadSheet, LeadRecord } from "@/lib/types"
import { getDbLeads } from "@/lib/db"
import type { Database } from "@/lib/types/supabase"

type DbLeadSheet = Database["public"]["Tables"]["lead_sheets"]["Row"]

function getAdmin() {
  return getSupabaseAdmin()
}

function dbLeadSheetToSheet(db: DbLeadSheet): LeadSheet {
  return {
    id: db.id,
    name: db.name,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    leadIds: db.lead_ids,
    totalLeads: db.total_leads,
    approvedLeads: db.approved_leads,
    rejectedLeads: db.rejected_leads,
    verificationSummary: db.verification_summary as LeadSheet["verificationSummary"],
    templateId: db.template_id,
    templateName: db.template_name,
    templateCategory: db.template_category,
    status: db.status as LeadSheet["status"],
    sendAt: db.send_at,
    scheduledCampaignId: db.scheduled_campaign_id,
    scheduledBatchId: db.scheduled_batch_id,
  }
}

function sheetToDbLeadSheet(sheet: LeadSheet): any {
  return {
    id: sheet.id,
    name: sheet.name,
    created_at: sheet.createdAt,
    updated_at: sheet.updatedAt,
    lead_ids: sheet.leadIds,
    total_leads: sheet.totalLeads,
    approved_leads: sheet.approvedLeads,
    rejected_leads: sheet.rejectedLeads,
    verification_summary: sheet.verificationSummary,
    template_id: sheet.templateId,
    template_name: sheet.templateName,
    template_category: sheet.templateCategory,
    status: sheet.status,
    send_at: sheet.sendAt,
    scheduled_campaign_id: sheet.scheduledCampaignId,
    scheduled_batch_id: sheet.scheduledBatchId,
  }
}

async function loadAll(): Promise<LeadSheet[]> {
  const admin = getAdmin()
  const { data, error } = await admin.from("lead_sheets").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return ((data as DbLeadSheet[]) ?? []).map(dbLeadSheetToSheet)
}

async function persistAll(sheets: LeadSheet[]) {
  const admin = getAdmin()
  for (const sheet of sheets) {
    const { error } = await admin.from("lead_sheets").upsert(sheetToDbLeadSheet(sheet), { onConflict: "id" })
    if (error) throw error
  }
}

function buildVerificationSummary(leads: LeadRecord[]) {
  const summary = { valid: 0, invalid: 0, risky: 0, unknown: 0, not_verified: 0 }
  for (const l of leads) {
    const s = l.emailVerificationStatus ?? "not_verified"
    if (s in summary) (summary as Record<string, number>)[s] += 1
    else summary.not_verified += 1
  }
  return summary
}

export async function createLeadSheet(input: { name: string; leadIds: string[] }): Promise<LeadSheet> {
  const name = input.name.trim()
  if (!name) throw new Error("Sheet name is required")
  if (!input.leadIds?.length) throw new Error("leadIds is required")
  const uniqueIds = [...new Set(input.leadIds)]
  if (uniqueIds.length > 5000) throw new Error("Too many leads (max 5000)")

  const allLeads = await getDbLeads()
  const map = new Map(allLeads.map((l) => [l.channelId, l]))
  const found = uniqueIds.map((id) => map.get(id)).filter(Boolean) as LeadRecord[]
  if (found.length === 0) throw new Error("No matching approved leads found for provided IDs")

  const approved = found.filter((l) => l.approvalStatus === "approved").length
  const rejected = found.filter((l) => l.approvalStatus === "rejected").length
  const summary = buildVerificationSummary(found)

  const now = new Date().toISOString()
  const sheet: LeadSheet = {
    id: `sheet_${crypto.randomUUID()}`,
    name,
    createdAt: now,
    updatedAt: now,
    leadIds: uniqueIds,
    totalLeads: uniqueIds.length,
    approvedLeads: approved,
    rejectedLeads: rejected,
    verificationSummary: summary,
    templateId: null,
    templateName: null,
    templateCategory: null,
    status: "draft",
    sendAt: null,
    scheduledCampaignId: null,
    scheduledBatchId: null,
  }

  await persistAll([sheet])
  return sheet
}

export async function getLeadSheet(id: string): Promise<LeadSheet | null> {
  const admin = getAdmin()
  const { data, error } = await admin.from("lead_sheets").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? dbLeadSheetToSheet(data) : null
}

export async function listLeadSheets(): Promise<LeadSheet[]> {
  return loadAll()
}

export async function updateLeadSheetTemplate(
  id: string,
  template: { id: number; name: string; category: string },
): Promise<LeadSheet | null> {
  const sheets = await loadAll()
  const existing = sheets.find((s) => s.id === id)
  if (!existing) return null

  const updated: LeadSheet = {
    ...existing,
    templateId: template.id,
    templateName: template.name,
    templateCategory: template.category,
    status: existing.sendAt ? "scheduled" : "ready_for_bulk_mail",
    updatedAt: new Date().toISOString(),
  }

  await persistAll([updated])
  return updated
}

export async function updateLeadSheetLeads(id: string, leadIds: string[]): Promise<LeadSheet | null> {
  const sheets = await loadAll()
  const existing = sheets.find((s) => s.id === id)
  if (!existing) return null

  const uniqueIds = [...new Set(leadIds)]
  const allLeads = await getDbLeads()
  const map = new Map(allLeads.map((l) => [l.channelId, l]))
  const found = uniqueIds.map((id) => map.get(id)).filter(Boolean) as LeadRecord[]
  const summary = buildVerificationSummary(found)
  const approved = found.filter((l) => l.approvalStatus === "approved").length
  const rejected = found.filter((l) => l.approvalStatus === "rejected").length

  const updated: LeadSheet = {
    ...existing,
    leadIds: uniqueIds,
    totalLeads: uniqueIds.length,
    approvedLeads: approved,
    rejectedLeads: rejected,
    verificationSummary: summary,
    updatedAt: new Date().toISOString(),
  }

  if (approved === 0) updated.status = "draft"

  await persistAll([updated])
  return updated
}

export async function updateLeadSheetName(id: string, name: string): Promise<LeadSheet | null> {
  const sheets = await loadAll()
  const existing = sheets.find((s) => s.id === id)
  if (!existing) return null

  const trimmed = name.trim()
  if (!trimmed) throw new Error("Sheet name is required")

  const updated: LeadSheet = { ...existing, name: trimmed, updatedAt: new Date().toISOString() }
  await persistAll([updated])
  return updated
}

async function tryAutoScheduleSheet(id: string): Promise<LeadSheet | null> {
  const sheets = await loadAll()
  const existing = sheets.find((s) => s.id === id)
  if (!existing) return null

  if (existing.approvedLeads > 0 && existing.templateId !== null && (existing.status === "draft" || existing.status === "ready_for_bulk_mail")) {
    const nowIso = new Date().toISOString()
    const updated: LeadSheet = {
      ...existing,
      sendAt: nowIso,
      status: "scheduled",
      updatedAt: nowIso,
    }
    await persistAll([updated])
    return updated
  }
  return null
}

export async function updateLeadSheetSendAt(id: string, sendAt: string | null): Promise<LeadSheet | null> {
  const sheets = await loadAll()
  const existing = sheets.find((s) => s.id === id)
  if (!existing) return null

  if (sendAt !== null) {
    const d = new Date(sendAt)
    if (isNaN(d.getTime())) throw new Error("Invalid sendAt timestamp")
    if (!existing.templateId) throw new Error("Template must be selected before scheduling send time")
  }

  const normalized = sendAt ? new Date(sendAt).toISOString() : null
  let status = existing.status
  if (normalized) {
    status = "scheduled"
  } else if (existing.templateId) {
    status = "ready_for_bulk_mail"
  } else {
    status = "draft"
  }

  const updated: LeadSheet = {
    ...existing,
    sendAt: normalized,
    status: status as LeadSheet["status"],
    updatedAt: new Date().toISOString(),
  }

  await persistAll([updated])
  return updated
}

export async function updateLeadSheetScheduledIds(
  id: string,
  patch: { scheduledCampaignId?: number | null; scheduledBatchId?: number | null; status?: LeadSheet["status"] },
): Promise<LeadSheet | null> {
  const sheets = await loadAll()
  const existing = sheets.find((s) => s.id === id)
  if (!existing) return null

  const updated: LeadSheet = {
    ...existing,
    scheduledCampaignId: patch.scheduledCampaignId !== undefined ? patch.scheduledCampaignId : existing.scheduledCampaignId,
    scheduledBatchId: patch.scheduledBatchId !== undefined ? patch.scheduledBatchId : existing.scheduledBatchId,
    status: (patch.status as LeadSheet["status"]) ?? existing.status,
    updatedAt: new Date().toISOString(),
  }

  await persistAll([updated])
  return updated
}

export function getLeadSheetStatusLabel(status: LeadSheet["status"]): string {
  const map: Record<string, string> = {
    draft: "WAITING_FOR_APPROVAL",
    ready_for_bulk_mail: "READY_TO_SCHEDULE",
    scheduled: "SCHEDULED",
    sending: "SENDING",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
    archived: "BLOCKED",
  }
  return map[status] ?? status.toUpperCase()
}

export async function _clearSheetsForTests(): Promise<void> {
  const admin = getAdmin()
  await admin.from("lead_sheets").delete().neq("id", "00000000-0000-0000-0000-000000000000")
}
import { getSupabaseAdmin } from "@/lib/supabase/client"
import type { EmailEvent, LeadRecord, SearchHistoryEntry, LeadFilters } from "@/lib/types"
import { normalizeLeadRecord } from "@/lib/crm"
import type { Json } from "@/lib/types/supabase"
import type { Database } from "@/lib/types/supabase"

type DbLead = Database["public"]["Tables"]["leads"]["Row"]
type DbSearchHistory = Database["public"]["Tables"]["search_history"]["Row"]
type DbEmailEvent = Database["public"]["Tables"]["email_events"]["Row"]
type DbLeadSheet = Database["public"]["Tables"]["lead_sheets"]["Row"]
type DbAutomationJob = Database["public"]["Tables"]["automation_jobs"]["Row"]
type DbVerificationJob = Database["public"]["Tables"]["verification_jobs"]["Row"]
type DbAppKv = Database["public"]["Tables"]["app_kv"]["Row"]

function getAdmin() {
  return getSupabaseAdmin()
}

function dbLeadToLeadRecord(db: DbLead): LeadRecord {
  return normalizeLeadRecord({
    id: db.id,
    source: (db.source as LeadRecord["source"]) || "youtube",
    searchKeyword: db.keyword || "",
    leadScore: (db.lead_score as LeadRecord["leadScore"]) || "Medium",
    channelId: db.channel_id || "",
    channelName: db.company || "",
    channelUrl: "",
    subscribers: db.subscribers || 0,
    videoCount: 0,
    viewCount: 0,
    description: "",
    country: db.country || "",
    state: "",
    customUrl: "",
    thumbnail: "",
    publishedAt: "",
    ageInYears: 0,
    website: db.website || "",
    email: db.email,
    phone: db.phone || "",
    instagram: db.instagram || "",
    facebook: db.facebook || "",
    telegram: db.telegram || "",
    appAvailable: false,
    websiteAvailable: false,
    leadStatus: (db.lead_status as LeadRecord["leadStatus"]) || "New",
    leadStage: db.lead_stage as LeadRecord["leadStage"] | undefined,
    approved: false,
    verified: false,
    sendMail: db.send_mail ?? undefined,
    status: db.status as LeadRecord["status"] | undefined,
    replyStatus: db.reply_status as LeadRecord["replyStatus"] | undefined,
    sentTime: db.sent_time ?? undefined,
    lastFollowupTime: db.last_followup_time ?? undefined,
    followupCount: db.followup_count || 0,
    threadId: db.thread_id ?? undefined,
    campaignId: db.campaign_id ?? undefined,
    demoSent: db.demo_sent ?? undefined,
    demoSentTime: db.demo_sent_time ?? undefined,
    demoType: db.demo_type ?? undefined,
    interested: db.interested ?? undefined,
    meetingScheduled: db.meeting_scheduled ?? undefined,
    closedWon: db.closed_won ?? undefined,
    closedLost: db.closed_lost ?? undefined,
    lastReplyTime: db.last_reply_time ?? undefined,
    emailSentAt: db.email_sent_at ?? undefined,
    emailThreadId: db.email_thread_id ?? undefined,
    emailHistory: [],
    leadOwner: db.lead_owner ?? undefined,
    tags: db.tags || [],
    crmNotes: db.crm_notes ?? undefined,
    notes: db.notes || "",
    addedDate: db.added_date,
    lastUpdated: db.last_updated,
    emailVerificationStatus: (db.verification_status as LeadRecord["emailVerificationStatus"]) || "not_verified",
    verifiedAt: null,
    verificationProvider: null,
    verificationError: null,
    verificationScore: null,
    approvalStatus: (db.approval_status as LeadRecord["approvalStatus"]) || "pending_review",
    approvedAt: null,
    rejectedAt: null,
    company: db.company ?? undefined,
    contact: db.contact ?? undefined,
    keyword: db.keyword ?? undefined,
    matchedKeywords: db.matched_keywords ?? undefined,
  })
}

function dbSearchHistoryToEntry(db: DbSearchHistory): SearchHistoryEntry {
  return {
    id: db.id,
    searchKeyword: db.search_keyword,
    keywords: db.keywords,
    searchedAt: db.searched_at,
    totalLeadsFound: db.total_leads_found,
    filters: db.filters as unknown as LeadFilters | undefined,
  }
}

function dbEmailEventToEvent(db: DbEmailEvent): EmailEvent {
  return {
    id: db.id,
    leadId: db.lead_id,
    eventType: db.event_type as EmailEvent["eventType"],
    status: "sent",
    messageId: "",
    threadId: db.thread_id || "",
    subject: "",
    body: "",
    to: "",
    from: "",
    sentAt: db.sent_at || "",
  }
}

export async function getDbLeads(): Promise<LeadRecord[]> {
  const admin = getAdmin()
  const { data, error } = await admin.from("leads").select("*").order("last_updated", { ascending: false })
  if (error) throw error
  return ((data as DbLead[]) ?? []).map(dbLeadToLeadRecord)
}

export async function upsertDbLeads(incoming: LeadRecord[]): Promise<{ leads: LeadRecord[]; skippedDuplicates: number }> {
  const admin = getAdmin()
  let skippedDuplicates = 0

  // Fetch deleted leads emails to prevent re-import
  const { data: deletedLeads, error: deletedError } = await admin
    .from("deleted_leads")
    .select("normalized_email")
  if (deletedError) throw deletedError

  const deletedEmails = new Set((deletedLeads ?? []).map(d => d.normalized_email))

  for (const lead of incoming.map((item) => normalizeLeadRecord(item))) {
    const normEmail = lead.email.toLowerCase().trim()

    // Skip if this email was previously deleted
    if (deletedEmails.has(normEmail)) {
      skippedDuplicates++
      continue
    }

    const { error } = await admin
      .from("leads")
      .upsert<Database["public"]["Tables"]["leads"]["Insert"]>({
        channel_id: lead.channelId,
        email: lead.email,
        normalized_email: normEmail,
        company: lead.company,
        contact: lead.contact,
        phone: lead.phone,
        website: lead.website,
        instagram: lead.instagram,
        facebook: lead.facebook,
        telegram: lead.telegram,
        country: lead.country,
        subscribers: lead.subscribers,
        lead_status: lead.leadStatus,
        lead_stage: lead.leadStage,
        lead_score: lead.leadScore,
        source: lead.source,
        keyword: lead.keyword,
        matched_keywords: lead.matchedKeywords,
        notes: lead.notes,
        crm_notes: lead.crmNotes,
        tags: lead.tags,
        verification_status: lead.emailVerificationStatus || "not_verified",
        approval_status: lead.approvalStatus || "pending_review",
        lead_owner: lead.leadOwner,
        send_mail: lead.sendMail,
        status: lead.status,
        reply_status: lead.replyStatus,
        sent_time: lead.sentTime,
        last_followup_time: lead.lastFollowupTime,
        followup_count: lead.followupCount,
        thread_id: lead.threadId,
        campaign_id: lead.campaignId,
        demo_sent: lead.demoSent,
        demo_sent_time: lead.demoSentTime,
        demo_type: lead.demoType,
        interested: lead.interested,
        meeting_scheduled: lead.meetingScheduled,
        closed_won: lead.closedWon,
        closed_lost: lead.closedLost,
        last_reply_time: lead.lastReplyTime,
        email_sent_at: lead.emailSentAt,
        email_thread_id: lead.emailThreadId,
        added_date: lead.addedDate,
        last_updated: lead.lastUpdated,
      }, { onConflict: "normalized_email" })

    if (error) {
      if (error.code === "23505") {
        skippedDuplicates++
      } else {
        throw error
      }
    }
  }

  return { leads: await getDbLeads(), skippedDuplicates }
}

export async function updateDbLead(channelId: string, patch: Partial<LeadRecord>): Promise<LeadRecord | null> {
  const admin = getAdmin()

  const { data: existing, error: getError } = await admin.from("leads").select("*").eq("channel_id", channelId).maybeSingle()
  if (getError) throw getError
  if (!existing) return null

  const filteredPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
  const updated = normalizeLeadRecord({
    ...normalizeLeadRecord(existing as any),
    ...filteredPatch,
    lastUpdated: new Date().toISOString(),
  })

  const { error } = await admin
    .from("leads")
    .update<Database["public"]["Tables"]["leads"]["Update"]>({
      ...updated,
      normalized_email: updated.email.toLowerCase().trim(),
      last_updated: new Date().toISOString(),
    })
    .eq("channel_id", channelId)

  if (error) throw error
  return updated
}

export async function deleteDbLead(channelId: string): Promise<boolean> {
  const admin = getAdmin()

  // First, get the lead details to track in deleted_leads
  const { data: lead, error: getError } = await admin
    .from("leads")
    .select("channel_id, email, normalized_email, company")
    .eq("channel_id", channelId)
    .maybeSingle()

  if (getError) throw getError
  if (!lead) return false

  // Insert into deleted_leads to prevent re-import
  const { error: insertError } = await admin.from("deleted_leads").upsert({
    channel_id: lead.channel_id,
    email: lead.email,
    normalized_email: lead.normalized_email,
    company: lead.company,
    deleted_at: new Date().toISOString(),
  }, { onConflict: "normalized_email" })

  if (insertError) throw insertError

  // Now hard delete from leads
  const { error: deleteError } = await admin.from("leads").delete().eq("channel_id", channelId)
  if (deleteError) throw deleteError

  return true
}

export async function getDbSearchHistory(): Promise<SearchHistoryEntry[]> {
  const admin = getAdmin()
  const { data, error } = await admin.from("search_history").select("*").order("searched_at", { ascending: false }).limit(200)
  if (error) throw error
  return ((data as DbSearchHistory[]) ?? []).map((db) => ({
    id: db.id,
    searchKeyword: db.search_keyword,
    keywords: db.keywords,
    searchedAt: db.searched_at,
    totalLeadsFound: db.total_leads_found,
    filters: db.filters as unknown as LeadFilters | undefined,
  }))
}

export async function appendDbSearchHistory(entry: SearchHistoryEntry): Promise<void> {
  const admin = getAdmin()
  const { error } = await admin.from("search_history").upsert({
    id: entry.id,
    search_keyword: entry.searchKeyword,
    keywords: entry.keywords,
    searched_at: entry.searchedAt,
    total_leads_found: entry.totalLeadsFound,
    filters: entry.filters as any,
  }, { onConflict: "id" })
  if (error) throw error
}

export async function getDbEmailHistory(): Promise<EmailEvent[]> {
  const admin = getAdmin()
  const { data, error } = await admin.from("email_events").select("*").order("sent_at", { ascending: false, nullsFirst: false }).limit(500)
  if (error) throw error
  return ((data as DbEmailEvent[]) ?? []).map((db) => ({
    id: db.id,
    leadId: db.lead_id,
    eventType: db.event_type as EmailEvent["eventType"],
    status: "sent",
    messageId: "",
    threadId: db.thread_id || "",
    subject: "",
    body: "",
    to: "",
    from: "",
    sentAt: db.sent_at || "",
  }))
}

export async function appendDbEmailEvent(event: EmailEvent): Promise<void> {
  const admin = getAdmin()
  const { error } = await admin.from("email_events").upsert({
    id: event.id,
    lead_id: event.leadId,
    thread_id: event.threadId,
    event_type: event.eventType,
    sent_at: event.sentAt,
    data: event as any,
  }, { onConflict: "id" })
  if (error) throw error
}

export async function getDbValue<T>(key: string, fallback: T): Promise<T> {
  const admin = getAdmin()
  const { data, error } = await admin.from("app_kv").select("value").eq("key", key).maybeSingle()
  if (error) throw error
  return (data?.value as T) ?? fallback
}

export async function setDbValue<T>(key: string, value: T): Promise<void> {
  const admin = getAdmin()
  const { error } = await admin.from("app_kv").upsert({ key, value: value as any, updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) throw error
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}
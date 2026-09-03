import { buildStats, mergeAndDedupeLeads } from "@/lib/lead-utils";
import { LeadRecord, SearchHistoryEntry } from "@/lib/types";
import { readLeadsFile, updateJsonFile } from "@/lib/storage";
import { normalizeLeadRecord } from "@/lib/crm";
import { appendDbSearchHistory, getDbLeads, getDbSearchHistory, hasDatabaseUrl, updateDbLead, upsertDbLeads, deleteDbLead } from "@/lib/db";

const LEADS_FILE = "leads.json";
const HISTORY_FILE = "search-history.json";
const DELETED_LEADS_FILE = "deleted-leads.json";

async function getDeletedEmails(): Promise<Set<string>> {
  if (hasDatabaseUrl()) {
    // This shouldn't be called when DB is available - DB handles it
    return new Set()
  }
  const deleted = await readLeadsFile<{ normalized_email: string }[]>(DELETED_LEADS_FILE, []);
  return new Set(deleted.map(d => d.normalized_email));
}

async function addDeletedEmail(normalizedEmail: string): Promise<void> {
  if (hasDatabaseUrl()) return;
  await updateJsonFile<{ normalized_email: string }[]>(
    DELETED_LEADS_FILE,
    async (current) => {
      if (current.some(d => d.normalized_email === normalizedEmail)) return current;
      return [...current, { normalized_email: normalizedEmail }];
    },
    [],
  );
}

export async function getStoredLeads(): Promise<LeadRecord[]> {
  if (hasDatabaseUrl()) {
    return getDbLeads();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production lead storage.");
  }
  const leads = await readLeadsFile<LeadRecord[]>(LEADS_FILE, []);
  return leads.map((lead) => normalizeLeadRecord(lead));
}

export async function getSearchHistory(): Promise<SearchHistoryEntry[]> {
  if (hasDatabaseUrl()) {
    return getDbSearchHistory();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production search history.");
  }
  return readLeadsFile<SearchHistoryEntry[]>(HISTORY_FILE, []);
}

export async function saveNewLeads(leads: LeadRecord[]): Promise<{ leads: LeadRecord[]; skippedDuplicates: number }> {
  if (hasDatabaseUrl()) {
    return upsertDbLeads(leads);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production lead storage.");
  }
  const deletedEmails = await getDeletedEmails();
  let result = { leads: [] as LeadRecord[], skippedDuplicates: 0 };
  await updateJsonFile<LeadRecord[]>(
    LEADS_FILE,
    async (current) => {
      const normalizedCurrent = current.map((lead) => normalizeLeadRecord(lead));
      const normalizedIncoming = leads.map((lead) => normalizeLeadRecord(lead));
      // Filter out leads that were previously deleted
      const filteredIncoming = normalizedIncoming.filter(lead => !deletedEmails.has(lead.email.toLowerCase().trim()));
      const skippedFromDeleted = normalizedIncoming.length - filteredIncoming.length;
      const { merged, skippedDuplicates } = mergeAndDedupeLeads(normalizedCurrent, filteredIncoming);
      result = { leads: merged, skippedDuplicates: skippedDuplicates + skippedFromDeleted };
      return merged;
    },
    [],
  );
  return result;
}

export async function appendSearchHistory(entry: SearchHistoryEntry): Promise<void> {
  if (hasDatabaseUrl()) {
    await appendDbSearchHistory(entry);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production search history.");
  }
  await updateJsonFile<SearchHistoryEntry[]>(
    HISTORY_FILE,
    async (current) => [entry, ...current].slice(0, 200),
    [],
  );
}

export async function updateLeadByChannelId(
  channelId: string,
  patch: Partial<
    Pick<
      LeadRecord,
      | "leadStatus"
      | "notes"
      | "website"
      | "email"
      | "phone"
      | "instagram"
      | "facebook"
      | "telegram"
      | "approved"
      | "verified"
      | "sendMail"
      | "status"
      | "replyStatus"
      | "sentTime"
      | "lastFollowupTime"
      | "followupCount"
      | "threadId"
      | "campaignId"
      | "demoSent"
      | "demoSentTime"
      | "demoType"
      | "interested"
      | "meetingScheduled"
      | "closedWon"
      | "closedLost"
      | "lastReplyTime"
      | "emailSentAt"
      | "emailThreadId"
      | "leadStage"
      | "leadOwner"
      | "tags"
      | "crmNotes"
      | "channelName"
      | "country"
      | "source"
      | "leadScore"
      | "emailVerificationStatus"
      | "approvalStatus"
    >
  >,
): Promise<LeadRecord | null> {
  if (hasDatabaseUrl()) {
    return updateDbLead(channelId, patch);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production lead storage.");
  }
  let updated: LeadRecord | null = null;
  await updateJsonFile<LeadRecord[]>(
    LEADS_FILE,
    async (current) => {
      const next = current.map((lead) => {
        if (lead.channelId !== channelId) return lead;
        const filteredPatch = Object.fromEntries(
          Object.entries(patch).filter(([, value]) => value !== undefined),
        ) as Partial<LeadRecord>;
        updated = {
          ...normalizeLeadRecord(lead),
          ...filteredPatch,
          lastUpdated: new Date().toISOString(),
        };
        return updated;
      });
      return updated ? next : current;
    },
    [],
  );
  return updated;
}

export async function deleteLeadByChannelId(channelId: string): Promise<boolean> {
  if (hasDatabaseUrl()) {
    return deleteDbLead(channelId);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production lead storage.");
  }
  let deleted = false;
  let deletedEmail = "";
  await updateJsonFile<LeadRecord[]>(
    LEADS_FILE,
    async (current) => {
      const lead = current.find(l => l.channelId === channelId);
      if (lead) deletedEmail = lead.email.toLowerCase().trim();
      const next = current.filter((lead) => lead.channelId !== channelId);
      deleted = next.length !== current.length;
      return next;
    },
    [],
  );
  if (deleted && deletedEmail) {
    await addDeletedEmail(deletedEmail);
  }
  return deleted;
}

export async function seedStats(): Promise<ReturnType<typeof buildStats>> {
  const leads = await getStoredLeads();
  return buildStats(leads);
}

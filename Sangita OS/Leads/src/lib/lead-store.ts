import { buildStats, mergeAndDedupeLeads } from "@/lib/lead-utils";
import { LeadRecord, SearchHistoryEntry } from "@/lib/types";
import { readLeadsFile, updateJsonFile } from "@/lib/storage";
import { normalizeLeadRecord } from "@/lib/crm";
import { appendDbSearchHistory, getDbLeads, getDbSearchHistory, hasDatabaseUrl, updateDbLead, upsertDbLeads } from "@/lib/db";

const LEADS_FILE = "leads.json";
const HISTORY_FILE = "search-history.json";

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
  let result = { leads: [] as LeadRecord[], skippedDuplicates: 0 };
  await updateJsonFile<LeadRecord[]>(
    LEADS_FILE,
    async (current) => {
      const normalizedCurrent = current.map((lead) => normalizeLeadRecord(lead));
      const normalizedIncoming = leads.map((lead) => normalizeLeadRecord(lead));
      const { merged, skippedDuplicates } = mergeAndDedupeLeads(normalizedCurrent, normalizedIncoming);
      result = { leads: merged, skippedDuplicates };
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
      | "lastEmailSubject"
      | "emailSentAt"
      | "emailThreadId"
      | "leadStage"
      | "leadOwner"
      | "tags"
      | "crmNotes"
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

export async function seedStats(): Promise<ReturnType<typeof buildStats>> {
  const leads = await getStoredLeads();
  return buildStats(leads);
}

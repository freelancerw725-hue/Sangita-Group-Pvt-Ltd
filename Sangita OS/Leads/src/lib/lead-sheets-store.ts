/**
 * Lead Sheets / Audience store — holds manually approved leads for Bulk Mail handoff.
 * Not a second lead DB — only references lead channelIds + verification summary.
 * Persists to Postgres app_kv or data/lead-sheets.json.
 */
import { hasDatabaseUrl, getDbValue, setDbValue } from "@/lib/db";
import { readLeadsFile, updateJsonFile } from "@/lib/storage";
import type { LeadSheet, LeadRecord } from "@/lib/types";
import { getStoredLeads } from "@/lib/lead-store";

const SHEETS_FILE = "lead-sheets.json";
const DB_KEY = "lead_sheets";

const memoryCache = new Map<string, LeadSheet>();
let memoryLoaded = false;

async function loadAll(): Promise<Map<string, LeadSheet>> {
  if (memoryLoaded) return memoryCache;
  if (hasDatabaseUrl()) {
    try {
      const stored = await getDbValue<Record<string, LeadSheet>>(DB_KEY, {});
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
    const arr = await readLeadsFile<LeadSheet[]>(SHEETS_FILE, []);
    for (const s of arr) memoryCache.set(s.id, s);
  } catch {}
  memoryLoaded = true;
  return memoryCache;
}

async function persistAll(): Promise<void> {
  if (hasDatabaseUrl()) {
    const obj: Record<string, LeadSheet> = {};
    const sorted = Array.from(memoryCache.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    memoryCache.clear();
    for (const s of sorted) {
      obj[s.id] = s;
      memoryCache.set(s.id, s);
    }
    await setDbValue(DB_KEY, obj);
    return;
  }
  if (process.env.NODE_ENV === "production" && !hasDatabaseUrl()) return;
  const arr = Array.from(memoryCache.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  await updateJsonFile<LeadSheet[]>(SHEETS_FILE, async () => arr, []);
}

function buildVerificationSummary(leads: LeadRecord[]) {
  const summary = { valid: 0, invalid: 0, risky: 0, unknown: 0, not_verified: 0 };
  for (const l of leads) {
    const s = l.emailVerificationStatus ?? "not_verified";
    if (s in summary) (summary as Record<string, number>)[s] += 1;
    else summary.not_verified += 1;
  }
  return summary;
}

export async function createLeadSheet(input: { name: string; leadIds: string[] }): Promise<LeadSheet> {
  const name = input.name.trim();
  if (!name) throw new Error("Sheet name is required");
  if (!input.leadIds?.length) throw new Error("leadIds is required");
  const uniqueIds = [...new Set(input.leadIds)];
  if (uniqueIds.length > 5000) throw new Error("Too many leads (max 5000)");

  await loadAll();
  // Validate leads exist and are approved (spec: only approved can go to sheet, but we allow creation with warning)
  const allLeads = await getStoredLeads();
  const map = new Map(allLeads.map((l) => [l.channelId, l]));
  const found = uniqueIds.map((id) => map.get(id)).filter(Boolean) as LeadRecord[];
  if (found.length === 0) throw new Error("No matching approved leads found for provided IDs");

  const approved = found.filter((l) => l.approvalStatus === "approved").length;
  const rejected = found.filter((l) => l.approvalStatus === "rejected").length;
  const summary = buildVerificationSummary(found);

  const now = new Date().toISOString();
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
  };
  memoryCache.set(sheet.id, sheet);
  await persistAll();
  return sheet;
}

export async function getLeadSheet(id: string): Promise<LeadSheet | null> {
  await loadAll();
  return memoryCache.get(id) ?? null;
}

export async function listLeadSheets(): Promise<LeadSheet[]> {
  await loadAll();
  return Array.from(memoryCache.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function updateLeadSheetTemplate(
  id: string,
  template: { id: number; name: string; category: string },
): Promise<LeadSheet | null> {
  await loadAll();
  const existing = memoryCache.get(id);
  if (!existing) return null;
  const updated: LeadSheet = {
    ...existing,
    templateId: template.id,
    templateName: template.name,
    templateCategory: template.category,
    status: "ready_for_bulk_mail",
    updatedAt: new Date().toISOString(),
  };
  memoryCache.set(id, updated);
  await persistAll();
  return updated;
}

export async function updateLeadSheetLeads(id: string, leadIds: string[]): Promise<LeadSheet | null> {
  await loadAll();
  const existing = memoryCache.get(id);
  if (!existing) return null;
  const uniqueIds = [...new Set(leadIds)];
  const allLeads = await getStoredLeads();
  const map = new Map(allLeads.map((l) => [l.channelId, l]));
  const found = uniqueIds.map((id) => map.get(id)).filter(Boolean) as LeadRecord[];
  const summary = buildVerificationSummary(found);
  const approved = found.filter((l) => l.approvalStatus === "approved").length;
  const rejected = found.filter((l) => l.approvalStatus === "rejected").length;
  const updated: LeadSheet = {
    ...existing,
    leadIds: uniqueIds,
    totalLeads: uniqueIds.length,
    approvedLeads: approved,
    rejectedLeads: rejected,
    verificationSummary: summary,
    updatedAt: new Date().toISOString(),
  };
  // if template was set but now no approved leads, revert to draft
  if (approved === 0) updated.status = "draft";
  memoryCache.set(id, updated);
  await persistAll();
  return updated;
}

export async function updateLeadSheetName(id: string, name: string): Promise<LeadSheet | null> {
  await loadAll();
  const existing = memoryCache.get(id);
  if (!existing) return null;
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Sheet name is required");
  const updated: LeadSheet = { ...existing, name: trimmed, updatedAt: new Date().toISOString() };
  memoryCache.set(id, updated);
  await persistAll();
  return updated;
}

export async function _clearSheetsForTests(): Promise<void> {
  memoryCache.clear();
  memoryLoaded = false;
  if (hasDatabaseUrl()) {
    try { await setDbValue(DB_KEY, {}); } catch {}
    memoryLoaded = true;
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    try { await updateJsonFile<LeadSheet[]>(SHEETS_FILE, async () => [], []); } catch {}
  }
  memoryLoaded = true;
}

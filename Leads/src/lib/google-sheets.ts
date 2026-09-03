import { google, sheets_v4 } from "googleapis";
import { LeadRecord, SyncResponse } from "@/lib/types";
import { requireEnvValue } from "@/lib/env";
import { CRM_SHEET_HEADERS, getCrmSheetRow, normalizeLeadRecord } from "@/lib/crm";
import { getStoredLeads } from "@/lib/lead-store";

const LEGACY_SHEET_NAME = "SwiftGrowth Leads";

// Channel ID is in column C (index 2)
const CHANNEL_ID_COLUMN = "C";

async function getSheetIdByName(spreadsheets: sheets_v4.Sheets, spreadsheetId: string, tabName: string): Promise<number | null> {
  const workbook = await spreadsheets.spreadsheets.get({ spreadsheetId });
  const sheet = workbook.data.sheets?.find(s => s.properties?.title === tabName);
  return sheet?.properties?.sheetId ?? null;
}

async function findLeadTabByChannelId(
  spreadsheets: sheets_v4.Sheets,
  spreadsheetId: string,
  channelId: string
): Promise<{ tabName: string; rowIndex: number } | null> {
  const sheetNames = await getSheetNames(spreadsheets, spreadsheetId);
  
  // Only search DATA - * tabs, skip legacy and other tabs
  const dataTabs = Array.from(sheetNames).filter(name => name.startsWith("DATA - "));
  
  if (dataTabs.length === 0) return null;
  
  // Use batchGet to fetch channel ID column from all DATA tabs in ONE API call
  const ranges = dataTabs.map(tabName => `'${tabName}'!${CHANNEL_ID_COLUMN}2:${CHANNEL_ID_COLUMN}`);
  const response = await spreadsheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  });
  
  const valueRanges = response.data.valueRanges ?? [];
  for (let tabIdx = 0; tabIdx < valueRanges.length; tabIdx++) {
    const values = valueRanges[tabIdx].values ?? [];
    for (let i = 0; i < values.length; i++) {
      if (values[i]?.[0] === channelId) {
        // Row index is i + 2 (1-based header row + 1-based data rows)
        return { tabName: dataTabs[tabIdx], rowIndex: i + 2 };
      }
    }
  }
  
  return null;
}

async function updateLeadRowInSheet(
  spreadsheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string,
  rowIndex: number,
  lead: LeadRecord
): Promise<void> {
  const normalized = normalizeLeadRecord(lead);
  const row = getCrmSheetRow(normalized);
  
  await spreadsheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tabName}'!A${rowIndex}:AO${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });
}

async function deleteLeadRowFromSheet(
  spreadsheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string,
  rowIndex: number
): Promise<void> {
  const sheetId = await getSheetIdByName(spreadsheets, spreadsheetId, tabName);
  if (sheetId === null) {
    throw new Error(`Sheet "${tabName}" not found`);
  }
  
  await spreadsheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-based
              endIndex: rowIndex, // exclusive
            },
          },
        },
      ],
    },
  });
}

export async function syncLeadToGoogleSheets(channelId: string): Promise<{ updated: boolean; tabName?: string; error?: string }> {
  const authClient = buildClient();
  const { spreadsheetId } = getCredentials();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  const lead = await getStoredLeads().then(leads => leads.find(l => l.channelId === channelId));
  if (!lead) {
    return { updated: false, error: "Lead not found in database" };
  }

  const found = await findLeadTabByChannelId(sheets, spreadsheetId, channelId);
  if (!found) {
    return { updated: false, error: "Lead not found in any Google Sheets tab" };
  }

  await updateLeadRowInSheet(sheets, spreadsheetId, found.tabName, found.rowIndex, lead);
  return { updated: true, tabName: found.tabName };
}

export async function removeLeadFromGoogleSheets(channelId: string): Promise<{ deleted: boolean; tabName?: string; error?: string }> {
  const authClient = buildClient();
  const { spreadsheetId } = getCredentials();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  const found = await findLeadTabByChannelId(sheets, spreadsheetId, channelId);
  if (!found) {
    return { deleted: false, error: "Lead not found in any Google Sheets tab" };
  }

  await deleteLeadRowFromSheet(sheets, spreadsheetId, found.tabName, found.rowIndex);
  return { deleted: true, tabName: found.tabName };
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined;
  let normalized = value.trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  normalized = normalized.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");

  return normalized;
}

function getCredentials() {
  const spreadsheetId = requireEnvValue("GOOGLE_SHEET_ID", "Google Sheets is not configured. Set GOOGLE_SHEET_ID.").trim();
  const clientEmail = requireEnvValue("GOOGLE_CLIENT_EMAIL", "Google Sheets is not configured. Set GOOGLE_CLIENT_EMAIL.").trim();
  const privateKey = normalizeEnvValue(requireEnvValue("GOOGLE_PRIVATE_KEY", "Google Sheets is not configured. Set GOOGLE_PRIVATE_KEY."));

  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new Error(
      "Google Sheets credentials are incomplete. Check GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY.",
    );
  }

  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("-----END PRIVATE KEY-----")) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY is malformed. Ensure it contains the complete PEM block with BEGIN/END PRIVATE KEY boundaries.",
    );
  }

  if (privateKey.includes("...")) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY appears to contain placeholder text '...'. Replace it with the full private key from your service account JSON.",
    );
  }

  if (/\s/.test(spreadsheetId)) {
    throw new Error("GOOGLE_SHEET_ID appears malformed. It must not contain spaces or newlines.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    throw new Error("GOOGLE_CLIENT_EMAIL appears malformed. Use the service account email from your JSON credentials.");
  }

  return { spreadsheetId, clientEmail, privateKey };
}

function buildClient() {
  const { clientEmail, privateKey } = getCredentials();
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function sanitizeForTabName(input: string): string {
  return input
    .replace(/[\\/:*?"[\]<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function generateTabName(keywords: string, leads: LeadRecord[]): { tabName: string; state: string } {
  // Determine state from leads
  let state = "Other";
  if (leads.length > 0) {
    const states = new Map<string, number>();
    for (const lead of leads) {
      const normalized = normalizeLeadRecord(lead);
      const s = normalized.state || "Other";
      states.set(s, (states.get(s) ?? 0) + 1);
    }
    // Use the most common state
    let maxCount = 0;
    for (const [s, count] of states.entries()) {
      if (count > maxCount) {
        maxCount = count;
        state = s;
      }
    }
  }

  // Generate timestamp
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "-"); // HH-mm

  // Sanitize keywords for tab name
  const keywordPart = keywords ? sanitizeForTabName(keywords) : "Search";

  // Base tab name
  let baseTabName = `DATA - ${state} - ${dateStr} - ${timeStr} - ${keywordPart}`;
  
  // Ensure tab name doesn't exceed 100 chars (Google Sheets limit)
  if (baseTabName.length > 100) {
    baseTabName = baseTabName.slice(0, 100);
  }

  return { tabName: baseTabName, state };
}

async function getSheetNames(spreadsheets: sheets_v4.Sheets, spreadsheetId: string): Promise<Set<string>> {
  const workbook = await spreadsheets.spreadsheets.get({ spreadsheetId });
  const names = (workbook.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => typeof title === "string" && title.length > 0);
  return new Set(names);
}

async function ensureSheetExists(
  spreadsheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  existingSheets: Set<string>
): Promise<void> {
  if (existingSheets.has(sheetName)) return;

  await spreadsheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        },
      ],
    },
  });
  existingSheets.add(sheetName);
}

async function writeHeader(
  spreadsheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const headerArray = [...CRM_SHEET_HEADERS];
  await spreadsheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1:AO1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headerArray],
    },
  });
}

function getUniqueTabName(baseName: string, existingSheets: Set<string>): string {
  if (!existingSheets.has(baseName)) return baseName;
  
  let counter = 2;
  let newName = `${baseName} (${counter})`;
  while (existingSheets.has(newName)) {
    counter++;
    newName = `${baseName} (${counter})`;
  }
  return newName;
}

export async function syncLeadsToGoogleSheets(leads: LeadRecord[], keywords: string): Promise<SyncResponse> {
  if (leads.length === 0) {
    return { appended: 0, tabName: "", state: "" };
  }

  const authClient = buildClient();
  const { spreadsheetId } = getCredentials();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  // Get all existing sheet names
  const existingSheets = await getSheetNames(sheets, spreadsheetId);

  // Generate tab name based on keywords and leads
  const { tabName: baseTabName, state } = generateTabName(keywords, leads);
  
  // Ensure unique tab name
  const tabName = getUniqueTabName(baseTabName, existingSheets);

  // Create the new tab
  await ensureSheetExists(sheets, spreadsheetId, tabName, existingSheets);

  // Write header
  await writeHeader(sheets, spreadsheetId, tabName);

  // Prepare rows - only these leads, no deduplication against other tabs
  // But deduplicate within this batch using Channel ID
  const seen = new Set<string>();
  const rows = leads
    .map((lead) => normalizeLeadRecord(lead))
    .filter((lead) => {
      if (seen.has(lead.channelId)) return false;
      seen.add(lead.channelId);
      return true;
    })
    .map((lead) => getCrmSheetRow(lead));

  if (rows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tabName}'!A:AO`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: rows,
      },
    });
  }

  return {
    appended: rows.length,
    tabName,
    state,
  };
}
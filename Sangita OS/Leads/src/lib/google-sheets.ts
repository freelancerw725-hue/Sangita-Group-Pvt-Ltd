import { google, sheets_v4 } from "googleapis";
import { LeadRecord, SyncResponse } from "@/lib/types";
import { requireEnvValue } from "@/lib/env";
import { CRM_SHEET_HEADERS, getCrmSheetRow, normalizeLeadRecord } from "@/lib/crm";

const SHEET_NAME = "SwiftGrowth Leads";

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

async function ensureSheetExists(authClient: ReturnType<typeof buildClient>, spreadsheetId: string) {
  const sheets = google.sheets({ version: "v4", auth: authClient });
  const workbook = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = workbook.data.sheets?.some((sheet) => sheet.properties?.title === SHEET_NAME);

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: SHEET_NAME,
              },
            },
          },
        ],
      },
    });
  }

  return sheets;
}

async function getExistingChannelIds(spreadsheets: sheets_v4.Sheets, spreadsheetId: string): Promise<Set<string>> {
  const response = await spreadsheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAME}'!C2:C`,
  });
  const values = response.data.values ?? [];
  return new Set(values.map((row) => String(row[0] ?? "").trim()).filter(Boolean));
}

export async function syncLeadsToGoogleSheets(leads: LeadRecord[]): Promise<SyncResponse> {
  if (leads.length === 0) {
    return { appended: 0, skippedExisting: 0, sheetName: SHEET_NAME };
  }

  const authClient = buildClient();
  const { spreadsheetId } = getCredentials();
  const sheets = await ensureSheetExists(authClient, spreadsheetId);
  const existingIds = await getExistingChannelIds(sheets, spreadsheetId);

  const rows = leads
    .map((lead) => normalizeLeadRecord(lead))
    .filter((lead) => {
      if (existingIds.has(lead.channelId)) return false;
      existingIds.add(lead.channelId);
      return true;
    })
    .map((lead) => getCrmSheetRow(lead));

  if (rows.length > 0) {
    const header = [...CRM_SHEET_HEADERS];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_NAME}'!A1:AN1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [header],
      },
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAME}'!A:AN`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: rows,
      },
    });
  }

  return {
    appended: rows.length,
    skippedExisting: leads.length - rows.length,
    sheetName: SHEET_NAME,
  };
}

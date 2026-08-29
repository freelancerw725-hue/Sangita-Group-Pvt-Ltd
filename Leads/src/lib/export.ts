import * as XLSX from "xlsx";
import { LeadFilters, LeadRecord } from "@/lib/types";
import { applyLeadFilters } from "@/lib/youtube";
import { CRM_SHEET_HEADERS, getCrmSheetRow, normalizeLeadRecord } from "@/lib/crm";

export function buildFilteredLeads(leads: LeadRecord[], filters: LeadFilters): LeadRecord[] {
  return applyLeadFilters(leads, filters);
}

export function leadsToCsv(leads: LeadRecord[]): string {
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };

  const rows = leads.map((lead) => getCrmSheetRow(normalizeLeadRecord(lead)));

  return [CRM_SHEET_HEADERS.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

export function leadsToExcelBuffer(leads: LeadRecord[]): ArrayBuffer {
  const worksheet = XLSX.utils.json_to_sheet(
    leads.map((lead) => {
      const row = getCrmSheetRow(normalizeLeadRecord(lead));
      return Object.fromEntries(CRM_SHEET_HEADERS.map((header, index) => [header, row[index]]));
    }),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
  const buffer = Buffer.from(XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

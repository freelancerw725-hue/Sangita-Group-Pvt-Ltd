import { NextResponse } from "next/server";
import { getLeadSheet } from "@/lib/lead-sheets-store";
import { getStoredLeads } from "@/lib/lead-store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sheet = await getLeadSheet(id);
  if (!sheet) return NextResponse.json({ error: "Sheet not found." }, { status: 404 });

  // Bulk Mail handoff boundary — read-only, no sending
  if (!sheet.templateId) {
    return NextResponse.json(
      { error: "No template selected. Select a Bulk Mail template before handoff.", sheet },
      { status: 400 },
    );
  }
  if (sheet.approvedLeads === 0) {
    return NextResponse.json(
      { error: "No approved leads in sheet. Approve leads before handoff.", sheet },
      { status: 400 },
    );
  }

  const all = await getStoredLeads();
  const map = new Map(all.map((l) => [l.channelId, l]));
  const leads = sheet.leadIds
    .map((cid) => map.get(cid))
    .filter((l) => l && l.approvalStatus === "approved")
    .map((l) => ({
      id: l!.channelId,
      email: l!.email,
      company: l!.channelName,
      contact: l!.channelName,
    }));

  const handoff = {
    sheetId: sheet.id,
    sheetName: sheet.name,
    templateId: sheet.templateId,
    templateName: sheet.templateName,
    leadIds: leads.map((l) => l.id),
    leads,
    total: leads.length,
    status: "READY_FOR_BULK_MAIL" as const,
  };

  // Do NOT trigger Bulk Mail campaign, queue, SMTP here
  return NextResponse.json({ handoff, sheet });
}

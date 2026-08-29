import { NextResponse } from "next/server";
import { z } from "zod";
import { getLeadSheet, updateLeadSheetTemplate, updateLeadSheetLeads, updateLeadSheetSendAt } from "@/lib/lead-sheets-store";
import { getBulkMailTemplate } from "@/lib/bulk-mail-templates";

export const runtime = "nodejs";

const patchSchema = z.object({
  templateId: z.coerce.number().int().positive().optional(),
  leadIds: z.array(z.string().trim().min(1).max(120)).max(5000).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  sendAt: z.string().max(100).nullable().optional(),
  scheduledCampaignId: z.coerce.number().int().positive().nullable().optional(),
  scheduledBatchId: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["draft","ready_for_bulk_mail","scheduled","sending","completed","cancelled","archived"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sheet = await getLeadSheet(id);
  if (!sheet) return NextResponse.json({ error: "Sheet not found." }, { status: 404 });
  return NextResponse.json({ sheet });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sheet = await getLeadSheet(id);
  if (!sheet) return NextResponse.json({ error: "Sheet not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch.", details: parsed.error.flatten() }, { status: 400 });

  // Template selection (manual, no auto-send)
  if (parsed.data.templateId !== undefined) {
    const tpl = await getBulkMailTemplate(parsed.data.templateId);
    if (!tpl) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    const updated = await updateLeadSheetTemplate(id, { id: tpl.id, name: tpl.name, category: tpl.category });
    return NextResponse.json({ sheet: updated });
  }

  if (parsed.data.leadIds) {
    const updated = await updateLeadSheetLeads(id, parsed.data.leadIds);
    return NextResponse.json({ sheet: updated });
  }

  if (parsed.data.name) {
    const { updateLeadSheetName } = await import("@/lib/lead-sheets-store");
    const updated = await updateLeadSheetName(id, parsed.data.name);
    if (!updated) return NextResponse.json({ error: "Sheet not found." }, { status: 404 });
    return NextResponse.json({ sheet: updated });
  }

  if (parsed.data.sendAt !== undefined) {
    try {
      const updated = await updateLeadSheetSendAt(id, parsed.data.sendAt);
      if (!updated) return NextResponse.json({ error: "Sheet not found." }, { status: 404 });
      return NextResponse.json({ sheet: updated });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (parsed.data.scheduledCampaignId !== undefined || parsed.data.scheduledBatchId !== undefined || parsed.data.status !== undefined) {
    const { updateLeadSheetScheduledIds } = await import("@/lib/lead-sheets-store");
    const updated = await updateLeadSheetScheduledIds(id, {
      scheduledCampaignId: parsed.data.scheduledCampaignId,
      scheduledBatchId: parsed.data.scheduledBatchId,
      status: parsed.data.status as never,
    });
    if (!updated) return NextResponse.json({ error: "Sheet not found." }, { status: 404 });
    return NextResponse.json({ sheet: updated });
  }

  return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
}

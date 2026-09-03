import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoredLeads } from "@/lib/lead-store";
import { updateDbLead, hasDatabaseUrl } from "@/lib/db";
import { updateLeadByChannelId } from "@/lib/lead-store";

export const runtime = "nodejs";

const schema = z.object({
  ids: z.array(z.string().trim().min(1).max(120)).min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload.", details: parsed.error.flatten() },
        { status: 400 },
      );

    const unique = [...new Set(parsed.data.ids)];
    const all = await getStoredLeads();
    const map = new Map(all.map((l) => [l.channelId, l]));
    const notFound: string[] = [];
    let updatedCount = 0;

    for (const id of unique) {
      const lead = map.get(id);
      if (!lead) {
        notFound.push(id);
        continue;
      }
      const patch = {
        approvalStatus: "approved" as const,
        approvedAt: new Date().toISOString(),
        rejectedAt: null,
      };
      if (hasDatabaseUrl()) await updateDbLead(id, patch as never);
      else await updateLeadByChannelId(id, patch as never);
      updatedCount += 1;
    }

    return NextResponse.json({
      updated: updatedCount,
      notFound,
      message: `Approved ${updatedCount} leads.`,
    });
  } catch (e) {
    console.error("BULK_APPROVE_ERROR", e);
    return NextResponse.json({ error: "Unable to approve leads." }, { status: 500 });
  }
}

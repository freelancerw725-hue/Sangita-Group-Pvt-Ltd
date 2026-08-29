import { NextResponse } from "next/server";
import { syncLeadsToGoogleSheets } from "@/lib/google-sheets";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { LeadRecord } from "@/lib/types";

export const runtime = "nodejs";

const syncSchema = z.object({
  keywords: z.string().optional(),
  leads: z.array(z.any()).optional(),
});

export async function POST(request: Request) {
  try {
    const limitResponse = enforceRateLimit(request);
    if (limitResponse) return limitResponse;

    const body = await request.json().catch(() => ({}));
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
    }

    const keywords = parsed.data.keywords ?? "";
    const leads = (parsed.data.leads ?? []) as LeadRecord[];

    if (leads.length === 0) {
      return NextResponse.json({ appended: 0, tabName: "", state: "" });
    }

    console.log("[api/sheets/sync] saving leads", { count: leads.length, keywords });
    const result = await syncLeadsToGoogleSheets(leads, keywords);
    return NextResponse.json(result);
  } catch (error) {
    console.error("SHEETS_SYNC_ERROR", error);
    return NextResponse.json(
      {
        success: false,
        error: "Google Sheets connection failed.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createLeadSheet, listLeadSheets } from "@/lib/lead-sheets-store";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  leadIds: z.array(z.string().trim().min(1).max(120)).min(1).max(5000),
});

export async function GET() {
  try {
    const sheets = await listLeadSheets();
    return NextResponse.json({ sheets });
  } catch (e) {
    console.error("LEAD_SHEETS_LIST_ERROR", e);
    return NextResponse.json({ error: "Unable to list sheets." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid sheet payload.", details: parsed.error.flatten() }, { status: 400 });
    }
    const sheet = await createLeadSheet({ name: parsed.data.name, leadIds: parsed.data.leadIds });
    return NextResponse.json({ sheet }, { status: 201 });
  } catch (e) {
    console.error("LEAD_SHEETS_CREATE_ERROR", e);
    return NextResponse.json({ error: (e as Error).message ?? "Unable to create sheet." }, { status: 500 });
  }
}

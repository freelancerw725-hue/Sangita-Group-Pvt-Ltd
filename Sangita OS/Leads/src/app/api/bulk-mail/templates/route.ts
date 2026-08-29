import { NextResponse } from "next/server";
import { fetchBulkMailTemplates } from "@/lib/bulk-mail-templates";

export const runtime = "nodejs";

export async function GET() {
  try {
    const templates = await fetchBulkMailTemplates();
    // Never expose internal Bulk Mail secrets — only template list
    return NextResponse.json({ templates });
  } catch (e) {
    console.error("BULK_TEMPLATES_ERROR", e);
    return NextResponse.json({ error: "Unable to fetch templates." }, { status: 500 });
  }
}

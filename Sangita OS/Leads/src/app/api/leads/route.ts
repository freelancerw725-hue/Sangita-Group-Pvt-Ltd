import { NextResponse } from "next/server";
import { buildStats } from "@/lib/lead-utils";
import { getStoredLeads } from "@/lib/lead-store";
import { parseFiltersFromSearchParams } from "@/lib/request";
import { applyLeadFilters } from "@/lib/youtube";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseFiltersFromSearchParams(url.searchParams);
    const leads = await getStoredLeads();
    const filtered = applyLeadFilters(leads, filters);
    return NextResponse.json({
      leads: filtered,
      stats: buildStats(leads),
    });
  } catch (error) {
    console.error("LEADS_LOAD_ERROR", error);
    return NextResponse.json({ error: "Unable to load leads. Please try again." }, { status: 500 });
  }
}

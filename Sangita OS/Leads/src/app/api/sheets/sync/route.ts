import { NextResponse } from "next/server";
import { getStoredLeads } from "@/lib/lead-store";
import { buildFilteredLeads } from "@/lib/export";
import { syncLeadsToGoogleSheets } from "@/lib/google-sheets";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { LeadFilters } from "@/lib/types";

export const runtime = "nodejs";

const syncSchema = z.object({
  filters: z
    .object({
      keywords: z.array(z.string()).optional(),
      minSubscribers: z.number().int().nonnegative().optional(),
      maxSubscribers: z.number().int().nonnegative().optional(),
      country: z.string().optional(),
      keywordFilter: z.string().optional(),
      channelAge: z.enum(["any", "under1", "oneToThree", "threeToFive", "overFive"]).optional(),
      sortBy: z.enum(["subscribers", "views", "videos"]).optional(),
    })
    .optional(),
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

    const filters: LeadFilters = {
      keywords: parsed.data.filters?.keywords ?? [],
      channelAge: parsed.data.filters?.channelAge ?? "any",
      sortBy: parsed.data.filters?.sortBy ?? "subscribers",
      minSubscribers: parsed.data.filters?.minSubscribers,
      maxSubscribers: parsed.data.filters?.maxSubscribers,
      country: parsed.data.filters?.country,
      keywordFilter: parsed.data.filters?.keywordFilter,
    };
    const leads = await getStoredLeads();
    const filtered = buildFilteredLeads(leads, filters);
    console.log("[api/sheets/sync] saving leads", { filteredCount: filtered.length });
    const result = await syncLeadsToGoogleSheets(filtered);
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

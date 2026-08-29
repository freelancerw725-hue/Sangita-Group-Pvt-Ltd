import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { executeLeadSearch } from "@/lib/automation-search";

export const runtime = "nodejs";

const searchSchema = z.object({
  keywords: z.union([z.string().max(1000), z.array(z.string().max(120)).max(20)]),
  filters: z
    .object({
      minSubscribers: z.number().int().nonnegative().optional(),
      maxSubscribers: z.number().int().nonnegative().optional(),
      country: z.string().max(80).optional(),
      keywordFilter: z.string().max(120).optional(),
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
    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid search payload." }, { status: 400 });
    }

    // Reuse the same search engine as automation — no duplicate logic
    const keywordsRaw = parsed.data.keywords;
    const result = await executeLeadSearch({
      keyword: Array.isArray(keywordsRaw) ? keywordsRaw[0] : keywordsRaw,
      keywords: Array.isArray(keywordsRaw) ? keywordsRaw : undefined,
      filters: parsed.data.filters,
    });

    return NextResponse.json(result.response);
  } catch (error) {
    console.error("SEARCH_ERROR", error);
    return NextResponse.json(
      { error: "Unable to search leads. Please try again." },
      { status: 500 },
    );
  }
}

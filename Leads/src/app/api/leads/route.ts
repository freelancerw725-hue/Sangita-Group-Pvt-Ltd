import { NextResponse } from "next/server";
import { z } from "zod";
import { buildStats } from "@/lib/lead-utils";
import { getStoredLeads, saveNewLeads } from "@/lib/lead-store";
import { parseFiltersFromSearchParams } from "@/lib/request";
import { applyLeadFilters } from "@/lib/youtube";
import { normalizeLeadRecord } from "@/lib/crm";
import { inferStateFromKeyword } from "@/lib/lead-utils";

export const runtime = "nodejs";

const createLeadSchema = z.object({
  channelId: z.string().min(3).max(120),
  channelName: z.string().min(1).max(500),
  channelUrl: z.string().url().optional(),
  subscribers: z.number().int().nonnegative().default(0),
  videoCount: z.number().int().nonnegative().default(0),
  viewCount: z.number().int().nonnegative().default(0),
  description: z.string().optional(),
  country: z.string().optional(),
  customUrl: z.string().optional(),
  thumbnail: z.string().optional(),
  publishedAt: z.string().optional(),
  ageInYears: z.number().default(0),
  website: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  telegram: z.string().optional(),
  appAvailable: z.boolean().default(false),
  websiteAvailable: z.boolean().default(false),
  source: z.enum(["youtube", "google_maps", "news", "real_estate", "local_business"]).default("youtube"),
  searchKeyword: z.string().default("manual"),
  leadScore: z.enum(["High", "Medium", "Low"]).default("Low"),
  leadStatus: z.enum(["New", "Contacted", "Replied", "Interested", "Closed", "Not Interested"]).default("New"),
  leadStage: z.enum(["New", "Approved", "Sent", "Opened", "Replied", "Interested", "Meeting Scheduled", "Closed Won", "Closed Lost"]).default("New"),
  notes: z.string().max(5000).optional(),
  crmNotes: z.string().max(5000).optional(),
  leadOwner: z.string().max(200).optional(),
  tags: z.array(z.string().max(100)).optional(),
});

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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid lead creation payload.", details: parsed.error.flatten() }, { status: 400 });
    }

    const now = new Date().toISOString();
    const searchKeyword = parsed.data.searchKeyword || "manual";
    const newLead = normalizeLeadRecord({
      id: crypto.randomUUID(),
      ...parsed.data,
      state: inferStateFromKeyword(searchKeyword),
      description: parsed.data.description || "",
      country: parsed.data.country || "",
      customUrl: parsed.data.customUrl || "",
      thumbnail: parsed.data.thumbnail || "",
      website: parsed.data.website || "",
      email: parsed.data.email || "",
      phone: parsed.data.phone || "",
      instagram: parsed.data.instagram || "",
      facebook: parsed.data.facebook || "",
      telegram: parsed.data.telegram || "",
      notes: parsed.data.notes || "",
      crmNotes: parsed.data.crmNotes || "",
      leadOwner: parsed.data.leadOwner || "",
      tags: parsed.data.tags || [],
      channelUrl: parsed.data.channelUrl || `https://youtube.com/channel/${parsed.data.channelId}`,
      publishedAt: parsed.data.publishedAt || now,
      addedDate: now,
      lastUpdated: now,
      emailVerificationStatus: "not_verified" as const,
      approvalStatus: "pending_review" as const,
      approved: false,
      verified: false,
      sendMail: false,
      status: "New",
      replyStatus: "No Reply",
      followupCount: 0,
    });

    const result = await saveNewLeads([newLead]);
    if (result.skippedDuplicates > 0) {
      return NextResponse.json({ error: "Lead with this channel ID already exists." }, { status: 409 });
    }

    return NextResponse.json({ lead: result.leads[0] }, { status: 201 });
  } catch (error) {
    console.error("LEAD_CREATE_ERROR", error);
    return NextResponse.json(
      { error: "Unable to create lead. Please try again." },
      { status: 500 },
    );
  }
}

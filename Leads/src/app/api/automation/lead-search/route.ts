import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isAutomationAuthorized, automationUnauthorizedResponse, safeLog } from "@/lib/automation-auth";
import { createJob, updateJob, findRunningByKeyword } from "@/lib/automation-jobs";
import { executeLeadSearch } from "@/lib/automation-search";

export const runtime = "nodejs";

const automationSchema = z.object({
  keyword: z.string().trim().min(1).max(200).optional(),
  keywords: z.array(z.string().trim().min(1).max(200)).min(1).max(5).optional(),
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
}).refine((d) => Boolean(d.keyword?.trim() || (d.keywords && d.keywords.length > 0)), {
  message: "keyword is required",
});

export async function POST(request: Request) {
  // Rate limit first
  const limitResponse = enforceRateLimit(request);
  if (limitResponse) return limitResponse;

  // Auth
  if (!isAutomationAuthorized(request)) {
    safeLog("automation POST unauthorized", { ip: request.headers.get("x-forwarded-for") });
    return automationUnauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = automationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid automation payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const keyword = parsed.data.keyword?.trim() ?? parsed.data.keywords?.[0]?.trim() ?? "";
  const keywords = parsed.data.keywords ?? (keyword ? [keyword] : []);
  // For Sangita OS bridge, primary is single keyword; we validate that
  const effectiveKeyword = keyword || keywords[0];
  if (!effectiveKeyword) {
    return NextResponse.json({ error: "keyword is required." }, { status: 400 });
  }

  // Idempotency / deduplication: if same keyword running within window, return existing job
  const existing = await findRunningByKeyword(effectiveKeyword);
  if (existing) {
    safeLog("automation idempotent hit", { keyword: effectiveKeyword, jobId: existing.jobId });
    return NextResponse.json(
      {
        jobId: existing.jobId,
        keyword: existing.keyword,
        status: existing.status,
        message: "Duplicate automation request — returning existing job.",
        idempotent: true,
      },
      { status: 200 },
    );
  }

  let job;
  try {
    job = await createJob({ keyword: effectiveKeyword, filters: parsed.data.filters });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // Mark running immediately, then execute async (non-blocking)
  await updateJob(job.jobId, { status: "running", startedAt: new Date().toISOString() });
  safeLog("automation job started", { jobId: job.jobId, keyword: job.keyword });

  // Fire-and-forget: update job on completion. Do not await in response.
  // Use `waitUntil` if available (Vercel), otherwise just run.
  const execPromise = executeLeadSearch({ keyword: effectiveKeyword, keywords, filters: parsed.data.filters })
    .then(async (result) => {
      const newLeadIds = result.response.currentSearchLeads.map((l) => l.channelId);
      await updateJob(job.jobId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        leadsFound: result.leadsFound,
        totalFound: result.totalFound,
        newLeads: result.newLeads,
        duplicates: result.duplicates,
        newLeadIds,
      });
      safeLog("automation job completed", {
        jobId: job.jobId,
        keyword: job.keyword,
        leadsFound: result.leadsFound,
        newLeads: result.newLeads,
        duplicates: result.duplicates,
      });
    })
    .catch(async (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Search failed";
      // Never expose internal YouTube key or stack — sanitize
      const safeMsg = msg.includes("YOUTUBE_API_KEY") ? "YouTube search failed." : msg.slice(0, 500);
      await updateJob(job.jobId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: safeMsg,
      });
      safeLog("automation job failed", { jobId: job.jobId, keyword: job.keyword, error: safeMsg });
    });

  // Ensure unhandled rejections don't crash: attach catch already.
  // In Next.js, keep promise alive without blocking response.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  execPromise.catch(() => {});

  return NextResponse.json(
    {
      jobId: job.jobId,
      keyword: job.keyword,
      status: "running",
      message: "Search started.",
    },
    { status: 202 },
  );
}

export async function GET(request: Request) {
  if (!isAutomationAuthorized(request)) return automationUnauthorizedResponse();
  return NextResponse.json({ error: "Use GET /api/automation/lead-search/:jobId or POST to create a job." }, { status: 405 });
}

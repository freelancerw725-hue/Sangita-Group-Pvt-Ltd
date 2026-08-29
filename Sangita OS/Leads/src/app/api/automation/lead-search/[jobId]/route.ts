import { NextResponse } from "next/server";
import { isAutomationAuthorized, automationUnauthorizedResponse } from "@/lib/automation-auth";
import { getJob } from "@/lib/automation-jobs";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  if (!isAutomationAuthorized(request)) return automationUnauthorizedResponse();

  const { jobId } = await context.params;
  if (!jobId || typeof jobId !== "string" || jobId.length < 8) {
    return NextResponse.json({ error: "Invalid jobId." }, { status: 400 });
  }

  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  // Never expose secrets — only public fields
  const payload: Record<string, unknown> = {
    jobId: job.jobId,
    keyword: job.keyword,
    status: job.status,
    leadsFound: job.leadsFound,
    newLeads: job.newLeads,
    duplicates: job.duplicates,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
  if (job.startedAt) payload.startedAt = job.startedAt;
  if (job.completedAt) payload.completedAt = job.completedAt;
  if (job.status === "failed" && job.errorMessage) payload.errorMessage = job.errorMessage;

  return NextResponse.json(payload);
}

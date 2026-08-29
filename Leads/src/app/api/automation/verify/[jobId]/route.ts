import { NextResponse } from "next/server";
import { isAutomationAuthorized, automationUnauthorizedResponse } from "@/lib/automation-auth";
import { getVerifyJob } from "@/lib/verification-jobs";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  if (!isAutomationAuthorized(request)) return automationUnauthorizedResponse();

  const { jobId } = await context.params;
  if (!jobId || typeof jobId !== "string" || jobId.length < 8) {
    return NextResponse.json({ error: "Invalid jobId." }, { status: 400 });
  }

  const job = await getVerifyJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Verification job not found." }, { status: 404 });
  }

  const payload: Record<string, unknown> = {
    jobId: job.jobId,
    status: job.status,
    total: job.total,
    valid: job.valid,
    invalid: job.invalid,
    risky: job.risky,
    unknown: job.unknown,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
  if (job.startedAt) payload.startedAt = job.startedAt;
  if (job.completedAt) payload.completedAt = job.completedAt;
  if (job.status === "failed" && job.errorMessage) payload.errorMessage = job.errorMessage;

  return NextResponse.json(payload);
}

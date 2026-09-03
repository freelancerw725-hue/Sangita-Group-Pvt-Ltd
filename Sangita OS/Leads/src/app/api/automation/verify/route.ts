import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  isAutomationAuthorized,
  automationUnauthorizedResponse,
  safeLog,
} from "@/lib/automation-auth";
import { createVerifyJob, updateVerifyJob } from "@/lib/verification-jobs";
import { createEmailVerifier } from "@/lib/verification";
import { getStoredLeads } from "@/lib/lead-store";
import { updateDbLead } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/db";
import { updateLeadByChannelId } from "@/lib/lead-store";
import { hasDatabaseUrl as hasDbUrl2 } from "@/lib/db";

export const runtime = "nodejs";

const verifySchema = z.object({
  leadIds: z.array(z.string().trim().min(1).max(120)).min(1).max(500),
});

export async function POST(request: Request) {
  const limitResponse = enforceRateLimit(request);
  if (limitResponse) return limitResponse;

  if (!isAutomationAuthorized(request)) {
    safeLog("verify POST unauthorized", { ip: request.headers.get("x-forwarded-for") });
    return automationUnauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid verification payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const leadIds = [...new Set(parsed.data.leadIds.map((s) => s.trim()).filter(Boolean))];
  if (leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds is required." }, { status: 400 });
  }

  // Verify leadIds exist (at least one)
  const all = await getStoredLeads();
  const existingIds = new Set(all.map((l) => l.channelId));
  const missing = leadIds.filter((id) => !existingIds.has(id));
  if (missing.length === leadIds.length) {
    return NextResponse.json(
      { error: "No matching leads found for provided IDs." },
      { status: 404 },
    );
  }
  // Allow partial — but log missing
  if (missing.length > 0) {
    safeLog("verify partial missing leads", {
      missingCount: missing.length,
      total: leadIds.length,
    });
  }
  const eligibleIds = leadIds.filter((id) => existingIds.has(id));

  let job;
  try {
    job = await createVerifyJob(eligibleIds);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // Idempotent check already inside createVerifyJob — if duplicate running, return it
  if (job.status !== "pending") {
    return NextResponse.json(
      {
        jobId: job.jobId,
        status: job.status,
        total: job.total,
        message: "Duplicate verification job — returning existing.",
        idempotent: true,
      },
      { status: 200 },
    );
  }

  await updateVerifyJob(job.jobId, { status: "running", startedAt: new Date().toISOString() });
  safeLog("verify job started", { jobId: job.jobId, total: eligibleIds.length });

  const verifier = createEmailVerifier();

  // Async execution
  const exec = (async () => {
    try {
      const leadsById = new Map(all.map((l) => [l.channelId, l]));
      let valid = 0,
        invalid = 0,
        risky = 0,
        unknown = 0,
        not_verified = 0;

      for (const id of eligibleIds) {
        const lead = leadsById.get(id);
        if (!lead) {
          not_verified += 1;
          continue;
        }
        const email = lead.email?.trim() ?? "";
        let result;
        try {
          result = await verifier.verify(email);
        } catch (err) {
          result = {
            email,
            status: "unknown" as const,
            provider: "mock",
            error: (err as Error).message,
          };
        }

        // Map to counts
        if (result.status === "valid") valid += 1;
        else if (result.status === "invalid") invalid += 1;
        else if (result.status === "risky") risky += 1;
        else unknown += 1;

        const patch: Record<string, unknown> = {
          emailVerificationStatus: result.status,
          verifiedAt: new Date().toISOString(),
          verificationProvider: result.provider,
          verificationError: result.error ?? null,
          verificationScore: result.score ?? null,
          // Manual approval required: valid does NOT auto-approve
          // Set pending_review if not already approved/rejected
          approvalStatus:
            lead.approvalStatus === "approved" || lead.approvalStatus === "rejected"
              ? lead.approvalStatus
              : "pending_review",
        };

        // Preserve existing approvalStatus if already approved/rejected; otherwise pending_review
        // Do not auto-approve
        try {
          if (hasDatabaseUrl()) {
            await updateDbLead(id, patch as never);
          } else {
            await updateLeadByChannelId(id, patch as never);
          }
        } catch (e) {
          safeLog("verify update lead failed", { id, error: (e as Error).message });
        }
      }

      await updateVerifyJob(job.jobId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        valid,
        invalid,
        risky,
        unknown,
        not_verified,
        total: eligibleIds.length,
      });
      safeLog("verify job completed", { jobId: job.jobId, valid, invalid, risky, unknown });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      await updateVerifyJob(job.jobId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: msg.slice(0, 500),
      });
      safeLog("verify job failed", { jobId: job.jobId, error: msg });
    }
  })();

  // Keep promise alive without blocking response
  exec.catch(() => {});

  return NextResponse.json(
    {
      jobId: job.jobId,
      status: "running",
      total: eligibleIds.length,
      message: "Verification started.",
    },
    { status: 202 },
  );
}

export async function GET(request: Request) {
  if (!isAutomationAuthorized(request)) return automationUnauthorizedResponse();
  return NextResponse.json(
    { error: "Use POST to start verification or GET /api/automation/verify/:jobId" },
    { status: 405 },
  );
}

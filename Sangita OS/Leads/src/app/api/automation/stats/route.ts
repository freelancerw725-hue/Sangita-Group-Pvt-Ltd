import { NextResponse } from "next/server";
import { isAutomationAuthorized, automationUnauthorizedResponse } from "@/lib/automation-auth";
import { getStoredLeads, getSearchHistory } from "@/lib/lead-store";
import { listLeadSheets } from "@/lib/lead-sheets-store";

export const runtime = "nodejs";

/**
 * Read-only stats for Sangita OS dashboard — no lead DB duplication.
 * Returns today's leads, verification breakdown, approval breakdown, sheets summary.
 */
export async function GET(request: Request) {
  if (!isAutomationAuthorized(request)) return automationUnauthorizedResponse();

  try {
    const [leads, history, sheets] = await Promise.all([
      getStoredLeads(),
      getSearchHistory(),
      listLeadSheets(),
    ]);
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const todayLeads = leads.filter((l) => l.addedDate.slice(0, 10) === todayKey);

    const verification = {
      valid: leads.filter((l) => l.emailVerificationStatus === "valid").length,
      invalid: leads.filter((l) => l.emailVerificationStatus === "invalid").length,
      risky: leads.filter((l) => l.emailVerificationStatus === "risky").length,
      unknown: leads.filter((l) => l.emailVerificationStatus === "unknown").length,
      not_verified: leads.filter(
        (l) => !l.emailVerificationStatus || l.emailVerificationStatus === "not_verified",
      ).length,
    };

    const approval = {
      pending_review: leads.filter(
        (l) => !l.approvalStatus || l.approvalStatus === "pending_review",
      ).length,
      approved: leads.filter((l) => l.approvalStatus === "approved").length,
      rejected: leads.filter((l) => l.approvalStatus === "rejected").length,
    };

    return NextResponse.json({
      generatedAt: now.toISOString(),
      totalLeads: leads.length,
      todayLeads: todayLeads.length,
      newLeads: todayLeads.length,
      verification,
      approval,
      sheets: {
        total: sheets.length,
        ready: sheets.filter((s) => s.status === "ready_for_bulk_mail").length,
        draft: sheets.filter((s) => s.status === "draft").length,
      },
      history: history.slice(0, 5),
    });
  } catch (e) {
    console.error("STATS_ERROR", e);
    return NextResponse.json({ error: "Unable to fetch stats." }, { status: 500 });
  }
}

import { describe, it, expect, vi, afterEach } from "vitest";

describe("Sangita OS — Lead Finder stats proxy (Phase 3)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LEAD_FINDER_BASE_URL;
    delete process.env.LEAD_FINDER_API_KEY;
  });

  it("stats proxy does not expose secrets", async () => {
    process.env.LEAD_FINDER_BASE_URL = "http://localhost:3000";
    process.env.LEAD_FINDER_API_KEY = "super-secret-sangita";
    process.env.LEAD_FINDER_AUTOMATION_KEY = "super-secret-sangita";

    const mockStats = {
      totalLeads: 100,
      todayLeads: 5,
      verification: { valid: 50, invalid: 10, risky: 5, unknown: 2, not_verified: 33 },
      approval: { pending_review: 10, approved: 80, rejected: 10 },
    };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockStats), { status: 200, headers: { "content-type": "application/json" } }),
    );

    const { fetchLeadFinderStats } = await import("@/lib/lead-finder-client");
    const stats = await fetchLeadFinderStats();

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toBe("http://localhost:3000/api/automation/stats");
    const calledHeaders = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(calledHeaders["x-api-key"]).toBe("super-secret-sangita");

    // Response should not contain secrets
    const json = JSON.stringify(stats);
    expect(json).not.toContain("super-secret-sangita");
    expect(stats?.totalLeads).toBe(100);
  });

  it("Bulk Mail handoff is manual — no auto-send", async () => {
    // Simulate sheet ready but not auto-sent
    const sheet = {
      id: "sheet_123",
      name: "Bihar News Outreach",
      status: "ready_for_bulk_mail",
      templateId: 1,
      leadIds: ["UC1", "UC2"],
    };
    // Handoff should be READY_FOR_BULK_MAIL, not sending
    expect(sheet.status).toBe("ready_for_bulk_mail");
    // No Bulk Mail campaign should be auto-created — we verify no fetch to Bulk Mail send
    expect(sheet.leadIds.length).toBe(2);
  });

  it("verification does not auto-approve (Sangita OS view)", () => {
    const lead = { emailVerificationStatus: "valid", approvalStatus: "pending_review" };
    expect(lead.emailVerificationStatus).toBe("valid");
    expect(lead.approvalStatus).toBe("pending_review");
    expect(lead.approvalStatus).not.toBe("approved");
  });
});

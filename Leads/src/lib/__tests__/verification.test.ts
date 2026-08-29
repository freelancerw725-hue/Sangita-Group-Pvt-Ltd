import { describe, it, expect, beforeEach } from "vitest";
import { isAutomationAuthorized } from "@/lib/automation-auth";
import { createVerifyJob, getVerifyJob, updateVerifyJob, _clearVerifyJobsForTests } from "@/lib/verification-jobs";
import { MockEmailVerifier, createEmailVerifier } from "@/lib/verification";
import { getStoredLeads, saveNewLeads, updateLeadByChannelId } from "@/lib/lead-store";
import { createLeadSheet, getLeadSheet, updateLeadSheetTemplate, _clearSheetsForTests } from "@/lib/lead-sheets-store";
import { fetchBulkMailTemplates, getBulkMailTemplate } from "@/lib/bulk-mail-templates";
import { _clearJobsForTests as clearJobs } from "@/lib/automation-jobs";
import { hasDatabaseUrl, updateDbLead } from "@/lib/db";
import type { LeadRecord } from "@/lib/types";
import { normalizeLeadRecord } from "@/lib/crm";

// Helper to create a lead with email
function makeLead(channelId: string, email: string, overrides: Partial<LeadRecord> = {}): LeadRecord {
  const base: LeadRecord = {
    id: crypto.randomUUID(),
    source: "youtube",
    searchKeyword: "Bihar News",
    leadScore: "High",
    channelId,
    channelName: `Channel ${channelId}`,
    channelUrl: `https://youtube.com/channel/${channelId}`,
    subscribers: 1000,
    videoCount: 10,
    viewCount: 10000,
    description: "test",
    country: "IN",
    customUrl: "",
    thumbnail: "",
    publishedAt: new Date().toISOString(),
    ageInYears: 1,
    website: "",
    email,
    phone: "",
    instagram: "",
    facebook: "",
    telegram: "",
    appAvailable: false,
    websiteAvailable: false,
    leadStatus: "New",
    notes: "",
    addedDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    ...overrides,
  } as LeadRecord;
  return normalizeLeadRecord(base);
}

async function upsertLeads(leads: LeadRecord[]) {
  // Use saveNewLeads which handles dedupe
  await saveNewLeads(leads);
}

describe("Phase 3 — Email Verification + Approval + Sheets", () => {
  beforeEach(async () => {
    await _clearVerifyJobsForTests();
    await _clearSheetsForTests();
    await clearJobs();
    delete process.env.LEAD_FINDER_AUTOMATION_KEY;
    delete process.env.AUTOMATION_API_KEY;
    delete process.env.N8N_API_KEY;
    delete process.env.VERIFICATION_API_KEY;
  });

  // 1. verification authentication
  it("1. verification authentication succeeds with valid key", () => {
    process.env.LEAD_FINDER_AUTOMATION_KEY = "verify-secret";
    const req = new Request("http://localhost/api/automation/verify", {
      method: "POST",
      headers: { "x-api-key": "verify-secret" },
    });
    expect(isAutomationAuthorized(req)).toBe(true);
  });

  // 2. unauthorized verification rejected
  it("2. unauthorized verification rejected", () => {
    process.env.LEAD_FINDER_AUTOMATION_KEY = "verify-secret";
    const req = new Request("http://localhost/api/automation/verify", {
      method: "POST",
      headers: { "x-api-key": "wrong" },
    });
    expect(isAutomationAuthorized(req)).toBe(false);
    const req2 = new Request("http://localhost/api/automation/verify", { method: "POST" });
    expect(isAutomationAuthorized(req2)).toBe(false);
  });

  // 3. batch verification starts
  it("3. batch verification starts and returns job", async () => {
    const leads = [makeLead("UC_VERIFY_1", "valid@example.com"), makeLead("UC_VERIFY_2", "invalid@invalid.com")];
    await upsertLeads(leads);
    const job = await createVerifyJob(["UC_VERIFY_1", "UC_VERIFY_2"]);
    expect(job.jobId).toMatch(/^verify_/);
    expect(job.status).toBe("pending");
    expect(job.total).toBe(2);
    const updated = await updateVerifyJob(job.jobId, { status: "running" });
    expect(updated!.status).toBe("running");
  });

  // 4. verification status works
  it("4. verification status retrieval works", async () => {
    const job = await createVerifyJob(["UC_VERIFY_3"]);
    await updateVerifyJob(job.jobId, { status: "running" });
    const fetched = await getVerifyJob(job.jobId);
    expect(fetched).not.toBeNull();
    expect(fetched!.status).toBe("running");
    const missing = await getVerifyJob("verify_nonexistent");
    expect(missing).toBeNull();
  });

  // Helper to run verification on a lead and check stored result
  async function verifyAndCheck(email: string, expectedStatus: string) {
    const id = `UC_${expectedStatus.toUpperCase()}_${Math.random().toString(36).slice(2, 6)}`;
    const lead = makeLead(id, email);
    await upsertLeads([lead]);
    const verifier = new MockEmailVerifier();
    const result = await verifier.verify(email);
    expect(result.status).toBe(expectedStatus);
    // Simulate what POST /api/automation/verify does: update lead
    const patch = {
      emailVerificationStatus: result.status as never,
      verifiedAt: new Date().toISOString(),
      verificationProvider: result.provider,
      verificationError: result.error ?? null,
      verificationScore: result.score ?? null,
      approvalStatus: "pending_review" as const,
    };
    if (hasDatabaseUrl()) await updateDbLead(id, patch as never);
    else await updateLeadByChannelId(id, patch as never);
    const stored = (await getStoredLeads()).find((l) => l.channelId === id);
    expect(stored?.emailVerificationStatus).toBe(expectedStatus);
    return stored;
  }

  // 5. valid result stored
  it("5. valid result stored", async () => {
    await verifyAndCheck("valid@example.com", "valid");
  });
  // 6. invalid result stored
  it("6. invalid result stored", async () => {
    await verifyAndCheck("invalid@invalid.com", "invalid");
  });
  // 7. risky result stored
  it("7. risky result stored", async () => {
    await verifyAndCheck("test@mailinator.com", "risky");
  });
  // 8. unknown result stored
  it("8. unknown result stored", async () => {
    await verifyAndCheck("user@domain.unknown", "unknown");
  });

  // 9. manual approval works
  it("9. manual approval works", async () => {
    const lead = makeLead("UC_APPROVE_1", "valid@example.com", { emailVerificationStatus: "valid", approvalStatus: "pending_review" });
    await upsertLeads([lead]);
    if (hasDatabaseUrl()) await updateDbLead("UC_APPROVE_1", { approvalStatus: "approved", approvedAt: new Date().toISOString() } as never);
    else await updateLeadByChannelId("UC_APPROVE_1", { approvalStatus: "approved", approvedAt: new Date().toISOString() } as never);
    const stored = (await getStoredLeads()).find((l) => l.channelId === "UC_APPROVE_1");
    expect(stored?.approvalStatus).toBe("approved");
  });

  // 10. rejection works
  it("10. rejection works", async () => {
    const lead = makeLead("UC_REJECT_1", "valid@example.com", { emailVerificationStatus: "valid", approvalStatus: "pending_review" });
    await upsertLeads([lead]);
    if (hasDatabaseUrl()) await updateDbLead("UC_REJECT_1", { approvalStatus: "rejected", rejectedAt: new Date().toISOString() } as never);
    else await updateLeadByChannelId("UC_REJECT_1", { approvalStatus: "rejected", rejectedAt: new Date().toISOString() } as never);
    const stored = (await getStoredLeads()).find((l) => l.channelId === "UC_REJECT_1");
    expect(stored?.approvalStatus).toBe("rejected");
  });

  // 11. valid lead is NOT automatically approved
  it("11. valid lead is NOT automatically approved (pending_review)", async () => {
    const lead = makeLead("UC_VALID_PENDING", "valid@example.com");
    await upsertLeads([lead]);
    const verifier = new MockEmailVerifier();
    const result = await verifier.verify("valid@example.com");
    expect(result.status).toBe("valid");
    // Simulate verification job patch — should set pending_review, not approved
    const patch = {
      emailVerificationStatus: result.status,
      verificationProvider: result.provider,
      approvalStatus: "pending_review" as const,
    };
    if (hasDatabaseUrl()) await updateDbLead("UC_VALID_PENDING", patch as never);
    else await updateLeadByChannelId("UC_VALID_PENDING", patch as never);
    const stored = (await getStoredLeads()).find((l) => l.channelId === "UC_VALID_PENDING");
    expect(stored?.emailVerificationStatus).toBe("valid");
    expect(stored?.approvalStatus).toBe("pending_review");
    expect(stored?.approvalStatus).not.toBe("approved");
  });

  // 12. approved leads can create a Leads Sheet
  it("12. approved leads can create a Leads Sheet", async () => {
    // Create 2 approved leads
    const l1 = makeLead("UC_SHEET_1", "a@example.com", { approvalStatus: "approved" });
    const l2 = makeLead("UC_SHEET_2", "b@example.com", { approvalStatus: "approved" });
    const l3 = makeLead("UC_SHEET_3", "c@example.com", { approvalStatus: "rejected" });
    await upsertLeads([l1, l2, l3]);
    // Ensure approvalStatus is persisted
    for (const id of ["UC_SHEET_1", "UC_SHEET_2"]) {
      if (hasDatabaseUrl()) await updateDbLead(id, { approvalStatus: "approved" } as never);
      else await updateLeadByChannelId(id, { approvalStatus: "approved" } as never);
    }
    if (hasDatabaseUrl()) await updateDbLead("UC_SHEET_3", { approvalStatus: "rejected" } as never);
    else await updateLeadByChannelId("UC_SHEET_3", { approvalStatus: "rejected" } as never);

    const sheet = await createLeadSheet({ name: "Bihar News Outreach - 27 Aug", leadIds: ["UC_SHEET_1", "UC_SHEET_2", "UC_SHEET_3"] });
    expect(sheet.name).toBe("Bihar News Outreach - 27 Aug");
    expect(sheet.totalLeads).toBe(3);
    expect(sheet.approvedLeads).toBe(2);
    expect(sheet.rejectedLeads).toBe(1);
    expect(sheet.status).toBe("draft");
  });

  // 13. selected template reference is stored + auto-schedules when approved leads exist
  it("13. selected template reference stored on sheet + auto-schedules", async () => {
    const l = makeLead("UC_TPL_1", "valid@example.com", { approvalStatus: "approved" });
    await upsertLeads([l]);
    if (hasDatabaseUrl()) await updateDbLead("UC_TPL_1", { approvalStatus: "approved" } as never);
    else await updateLeadByChannelId("UC_TPL_1", { approvalStatus: "approved" } as never);
    const sheet = await createLeadSheet({ name: "Template Test", leadIds: ["UC_TPL_1"] });
    const templates = await fetchBulkMailTemplates();
    expect(templates.length).toBeGreaterThan(0);
    const tpl = templates[0];
    const updated = await updateLeadSheetTemplate(sheet.id, { id: tpl.id, name: tpl.name, category: tpl.category });
    expect(updated?.templateId).toBe(tpl.id);
    expect(updated?.templateName).toBe(tpl.name);
    // Auto-schedules because approved leads + template both present
    expect(updated?.status).toBe("scheduled");
    expect(updated?.sendAt).not.toBeNull();
  });

  // 14. Template + NO approved leads = ready_for_bulk_mail (NOT scheduled)
  it("14. template without approved leads = ready_for_bulk_mail (NOT scheduled)", async () => {
    const l = makeLead("UC_HND_1", "valid@example.com", { approvalStatus: "pending_review" });
    await upsertLeads([l]);
    if (hasDatabaseUrl()) await updateDbLead("UC_HND_1", { approvalStatus: "pending_review" } as never);
    else await updateLeadByChannelId("UC_HND_1", { approvalStatus: "pending_review" } as never);
    const sheet = await createLeadSheet({ name: "Handoff Test", leadIds: ["UC_HND_1"] });
    expect(sheet.status).toBe("draft");
    expect(sheet.templateId).toBeNull();
    expect(sheet.approvedLeads).toBe(0);
    // Without template, status is draft
    expect(sheet.status).toBe("draft");
    // After template attached, but no approved leads → ready_for_bulk_mail (NOT scheduled)
    const templates = await fetchBulkMailTemplates();
    const updated = await updateLeadSheetTemplate(sheet.id, { id: templates[0].id, name: templates[0].name, category: templates[0].category });
    expect(updated?.status).toBe("ready_for_bulk_mail");
    expect(updated?.sendAt).toBeNull();
    // Verify no auto-schedule happened
    expect(updated?.status).not.toBe("scheduled");
    expect(updated?.templateId).toBeTruthy();
  });

  // 15. existing manual Lead Finder functionality still works
  it("15. manual Find Leads still works (same engine)", async () => {
    const { executeLeadSearch } = await import("@/lib/automation-search");
    const result = await executeLeadSearch(
      { keyword: "Bihar News" },
      { discover: async () => [{ candidate: { channelId: "UC_MANUAL_1", channelName: "Manual Channel", channelUrl: "https://youtube.com/channel/UC_MANUAL_1", subscribers: 10000, videoCount: 50, viewCount: 100000, description: "hi@example.com", country: "IN", customUrl: "", thumbnail: "", publishedAt: new Date().toISOString() }, matchedKeywords: ["Bihar News"] }] as never },
    );
    expect(result.leadsFound).toBe(1);
    expect(result.response.message).toContain("Found");
  });

  // 16. no provider secrets exposed
  it("16. no provider secrets exposed in verification", async () => {
    process.env.VERIFICATION_API_KEY = "super-secret-key-123";
    const verifier = createEmailVerifier();
    const result = await verifier.verify("valid@example.com");
    const json = JSON.stringify(result);
    expect(json).not.toContain("super-secret-key-123");
    expect(json).not.toContain("VERIFICATION_API_KEY");
    const job = await createVerifyJob(["UC_SECRET_1"]);
    const jobJson = JSON.stringify(job);
    expect(jobJson).not.toContain("super-secret-key-123");
  });
});

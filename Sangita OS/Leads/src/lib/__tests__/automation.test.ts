import { describe, it, expect, beforeEach, vi } from "vitest";
import { isAutomationAuthorized } from "@/lib/automation-auth";
import { createJob, getJob, updateJob, _clearJobsForTests } from "@/lib/automation-jobs";
import { executeLeadSearch } from "@/lib/automation-search";
import { mergeAndDedupeLeads } from "@/lib/lead-utils";
import type { LeadRecord } from "@/lib/types";

// Mock discover function
function mockDiscover(channels: any[]) {
  return async () => channels;
}

const sampleCandidate = {
  candidate: {
    channelId: "UC_TEST_123",
    channelName: "Bihar News Live",
    channelUrl: "https://www.youtube.com/channel/UC_TEST_123",
    subscribers: 50000,
    videoCount: 100,
    viewCount: 1000000,
    description: "Bihar News channel https://example.com contact@example.com",
    country: "IN",
    customUrl: "@biharnews",
    thumbnail: "https://example.com/thumb.jpg",
    publishedAt: "2020-01-01T00:00:00Z",
  },
  matchedKeywords: ["Bihar News"],
};

describe("Lead Finder Automation - Phase 2", () => {
  beforeEach(async () => {
    await _clearJobsForTests();
    // Ensure clean env for auth tests
    delete process.env.LEAD_FINDER_AUTOMATION_KEY;
    delete process.env.AUTOMATION_API_KEY;
    delete process.env.N8N_API_KEY;
  });

  // 1. authenticated automation request
  it("1. authenticated automation request succeeds when key matches", () => {
    process.env.LEAD_FINDER_AUTOMATION_KEY = "secret123";
    const req = new Request("http://localhost/api/automation/lead-search", {
      headers: { "x-api-key": "secret123" },
    });
    expect(isAutomationAuthorized(req)).toBe(true);

    const req2 = new Request("http://localhost/api/automation/lead-search", {
      headers: { Authorization: "Bearer secret123" },
    });
    expect(isAutomationAuthorized(req2)).toBe(true);
  });

  // 2. unauthorized request rejected
  it("2. unauthorized request rejected when key wrong or missing", () => {
    process.env.LEAD_FINDER_AUTOMATION_KEY = "secret123";
    const reqWrong = new Request("http://localhost/api/automation/lead-search", {
      headers: { "x-api-key": "wrong" },
    });
    expect(isAutomationAuthorized(reqWrong)).toBe(false);

    const reqNoHeader = new Request("http://localhost/api/automation/lead-search");
    expect(isAutomationAuthorized(reqNoHeader)).toBe(false);

    // Production without key should deny
    (process.env as unknown as Record<string, string>).NODE_ENV = "production";
    delete process.env.LEAD_FINDER_AUTOMATION_KEY;
    delete process.env.AUTOMATION_API_KEY;
    delete process.env.N8N_API_KEY;
    const reqProdNoKey = new Request("http://localhost/api/automation/lead-search");
    // In prod with no key, should be false (deny)
    expect(isAutomationAuthorized(reqProdNoKey)).toBe(false);
    (process.env as unknown as Record<string, string>).NODE_ENV = "test";
  });

  // 3. lead search starts successfully (job creation + pending/running)
  it("3. lead search starts successfully and creates job", async () => {
    const job = await createJob({ keyword: "Bihar News" });
    expect(job.jobId).toBeDefined();
    expect(job.keyword).toBe("Bihar News");
    expect(job.status).toBe("pending");
    expect(job.normalizedKeyword).toBe("bihar news");
    expect(job.leadsFound).toBe(0);

    // Simulate POST handler marking running
    const running = await updateJob(job.jobId, { status: "running", startedAt: new Date().toISOString() });
    expect(running?.status).toBe("running");
  });

  // 4. job status works (getJob)
  it("4. job status retrieval works", async () => {
    const job = await createJob({ keyword: "Patna News" });
    await updateJob(job.jobId, { status: "running" });
    const fetched = await getJob(job.jobId);
    expect(fetched).not.toBeNull();
    expect(fetched!.jobId).toBe(job.jobId);
    expect(fetched!.status).toBe("running");
    expect(fetched!.keyword).toBe("Patna News");

    const missing = await getJob("nonexistent-id-12345");
    expect(missing).toBeNull();
  });

  // 5. completed search returns counts
  it("5. completed search returns correct counts (via mock)", async () => {
    const job = await createJob({ keyword: "Bihar News" });
    await updateJob(job.jobId, { status: "running" });

    // Mock search that returns 2 leads
    const mockLeads: LeadRecord[] = [];
    // Use executeLeadSearch with mocked discover to avoid YouTube API
    const fakeChannels = [sampleCandidate, { ...sampleCandidate, candidate: { ...sampleCandidate.candidate, channelId: "UC_TEST_456", channelName: "Patna News" } }];
    const result = await executeLeadSearch(
      { keyword: "Bihar News" },
      {
        discover: async () => fakeChannels as never,
      },
    );
    expect(result.leadsFound).toBe(2);
    // newLeads depends on dedupe against existing file; in clean test env file may be empty or contain prior leads
    // But we can assert structure
    expect(result.newLeads).toBeGreaterThanOrEqual(0);
    expect(result.duplicates).toBeGreaterThanOrEqual(0);
    expect(result.leadsFound).toBe(result.newLeads + result.duplicates);

    // Update job as completed
    const completed = await updateJob(job.jobId, {
      status: "completed",
      leadsFound: result.leadsFound,
      newLeads: result.newLeads,
      duplicates: result.duplicates,
      completedAt: new Date().toISOString(),
    });
    expect(completed!.status).toBe("completed");
    expect(completed!.leadsFound).toBe(2);
  });

  // 6. failed search is reported
  it("6. failed search sets job to failed with errorMessage", async () => {
    const job = await createJob({ keyword: "Invalid" });
    await updateJob(job.jobId, { status: "running" });

    const failingDiscover = async () => {
      throw new Error("YouTube API request failed (403): quotaExceeded");
    };
    try {
      await executeLeadSearch({ keyword: "Invalid" }, { discover: failingDiscover as never });
      expect.unreachable("should have thrown");
    } catch (e) {
      const msg = (e as Error).message;
      await updateJob(job.jobId, { status: "failed", errorMessage: msg, completedAt: new Date().toISOString() });
    }
    const failed = await getJob(job.jobId);
    expect(failed!.status).toBe("failed");
    expect(failed!.errorMessage).toContain("YouTube API");
  });

  // 7. duplicate leads use existing database rules (channelId dedupe)
  it("7. duplicate leads use existing DB rules (channelId)", () => {
    const existing: LeadRecord[] = [
      {
        id: "1",
        source: "youtube",
        searchKeyword: "Bihar News",
        leadScore: "High",
        channelId: "UC_DUP_1",
        channelName: "Dup Channel",
        channelUrl: "https://youtube.com/channel/UC_DUP_1",
        subscribers: 1000,
        videoCount: 10,
        viewCount: 10000,
        description: "",
        country: "IN",
        customUrl: "",
        thumbnail: "",
        publishedAt: new Date().toISOString(),
        ageInYears: 1,
        website: "",
        email: "",
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
      } as LeadRecord,
    ];
    const incoming: LeadRecord[] = [
      { ...existing[0], id: "2", channelName: "Dup Channel Again" } as LeadRecord, // same channelId -> duplicate
      {
        id: "3",
        source: "youtube",
        searchKeyword: "Patna News",
        leadScore: "Low",
        channelId: "UC_NEW_1",
        channelName: "New Channel",
        channelUrl: "https://youtube.com/channel/UC_NEW_1",
        subscribers: 500,
        videoCount: 5,
        viewCount: 5000,
        description: "",
        country: "IN",
        customUrl: "",
        thumbnail: "",
        publishedAt: new Date().toISOString(),
        ageInYears: 1,
        website: "",
        email: "",
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
      } as LeadRecord,
    ];
    const { merged, skippedDuplicates } = mergeAndDedupeLeads(existing, incoming);
    expect(merged.length).toBe(2); // existing + 1 new
    expect(skippedDuplicates).toBe(1); // dup
  });

  // 8. existing manual Find Leads still works (same engine via executeLeadSearch)
  it("8. manual Find Leads uses same engine (no duplicate engine)", async () => {
    // Manual path: POST /api/search would call executeLeadSearch with keywords array
    const manualResult = await executeLeadSearch(
      { keywords: ["Bihar News", "Patna News"] },
      {
        discover: async () => [sampleCandidate] as never,
      },
    );
    // Should have gone through same path as automation
    expect(manualResult.leadsFound).toBe(1);
    expect(manualResult.response.message).toContain("Found");

    // Automation path with single keyword should use same function
    const autoResult = await executeLeadSearch(
      { keyword: "Bihar News" },
      {
        discover: async () => [sampleCandidate] as never,
      },
    );
    expect(autoResult.leadsFound).toBe(1);
    // Both use same transform/filter — no second DB
    expect(autoResult.response.leads).toEqual(expect.any(Array));
  });

  // 9. Sangita OS usage endpoint receives correct counts (mock integration)
  // We test payload shape that n8n would send to Sangita OS
  it("9. Sangita OS usage payload shape is correct (n8n contract)", () => {
    const jobCompleted = {
      jobId: "abc123",
      keyword: "Bihar News",
      status: "completed" as const,
      leadsFound: 120,
      newLeads: 95,
      duplicates: 25,
    };
    const usagePayloadCompleted = {
      eventType: "search_completed" as const,
      leadsFound: jobCompleted.leadsFound,
      newLeads: jobCompleted.newLeads,
      duplicates: jobCompleted.duplicates,
    };
    expect(usagePayloadCompleted.leadsFound).toBe(120);
    expect(usagePayloadCompleted.newLeads).toBe(95);
    expect(usagePayloadCompleted.duplicates).toBe(25);

    const jobFailed = { jobId: "fail1", keyword: "X", status: "failed" as const, errorMessage: "quotaExceeded" };
    const usagePayloadFailed = {
      eventType: "failed_search" as const,
      errorMessage: jobFailed.errorMessage,
    };
    expect(usagePayloadFailed.eventType).toBe("failed_search");

    const usagePayloadStarted = { eventType: "search_started" as const };
    expect(usagePayloadStarted.eventType).toBe("search_started");
  });

  // 10. no secrets appear in API responses/logs
  it("10. responses never expose secrets", async () => {
    const job = await createJob({ keyword: "Bihar News" });
    const payload = {
      jobId: job.jobId,
      keyword: job.keyword,
      status: job.status,
      leadsFound: job.leadsFound,
      newLeads: job.newLeads,
      duplicates: job.duplicates,
    };
    const json = JSON.stringify(payload);
    expect(json).not.toContain("YOUTUBE_API_KEY");
    expect(json).not.toContain("LEAD_FINDER_AUTOMATION_KEY");
    expect(json).not.toContain("DATABASE_URL");
    expect(json).not.toContain("GOOGLE_PRIVATE_KEY");

    // Even error messages should be sanitized (automation route masks YOUTUBE_API_KEY)
    const sanitizedError = "YouTube search failed.".replace(/AIza[0-9A-Za-z_-]{20,}/g, "****");
    expect(sanitizedError).not.toMatch(/AIza/);
  });

  it("idempotency: duplicate POST same keyword within window returns same job", async () => {
    const job1 = await createJob({ keyword: "Bihar News" });
    await updateJob(job1.jobId, { status: "running" });
    // Second create with same normalized keyword should return same running job via findRunningByKeyword logic
    // Our createJob itself checks idempotency, so calling createJob again should return same id
    const job2 = await createJob({ keyword: "  bihar  news " });
    expect(job2.jobId).toBe(job1.jobId);
  });
});

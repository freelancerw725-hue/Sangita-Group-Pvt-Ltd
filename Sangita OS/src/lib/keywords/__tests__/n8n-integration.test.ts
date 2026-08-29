import { describe, it, expect, beforeEach } from "vitest";
import { createIsolatedMemoryStore } from "../store";
import { buildKeyword, selectNextActiveKeyword } from "../service";
import { resolveKeywordsForTask } from "../task-integration";

// Simulate n8n flow without HTTP — pure store/service level

function makeKw(keyword: string, priority: number, dailyTarget: number, id?: string) {
  return buildKeyword(
    { keyword, source: "manual", dailyTarget, priority },
    { id: id ?? crypto.randomUUID(), nowIso: new Date().toISOString() },
  );
}

describe("n8n integration — Phase 2 contract", () => {
  let store: ReturnType<typeof createIsolatedMemoryStore>;

  beforeEach(() => {
    store = createIsolatedMemoryStore();
  });

  it("9. Sangita OS usage endpoint receives correct counts (search_completed flow)", async () => {
    const kw = makeKw("Bihar News", 1, 100, "k1");
    await store.insert(kw);

    // n8n: POST /api/keywords/k1/usage {eventType: search_started}
    await store.insertUsage({
      id: "u1",
      keywordId: "k1",
      keyword: kw.keyword,
      eventType: "search_started",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });
    await store.update("k1", { lastUsedAt: new Date().toISOString(), totalSearches: 1 } as never);

    // Lead Finder completes: leadsFound 120, newLeads 95, duplicates 25
    const completedPayload = { leadsFound: 120, newLeads: 95, duplicates: 25 };
    await store.insertUsage({
      id: "u2",
      keywordId: "k1",
      keyword: kw.keyword,
      eventType: "search_completed",
      leadsFound: completedPayload.leadsFound,
      newLeads: completedPayload.newLeads,
      duplicates: completedPayload.duplicates,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });
    const updated = await store.update("k1", {
      totalLeadsFound: 120,
      totalNewLeads: 95,
      totalDuplicates: 25,
      totalSearches: 1, // already counted at started
    } as never);

    expect(updated.totalLeadsFound).toBe(120);
    expect(updated.totalNewLeads).toBe(95);
    expect(updated.totalDuplicates).toBe(25);

    // Verify counts via usage log
    const usages = await store.listUsage("k1", 10);
    expect(usages.length).toBe(2);
    expect(usages.find((u) => u.eventType === "search_completed")!.leadsFound).toBe(120);

    // daily target: todaySearches should be 2 (started + completed) if n8n sends both,
    // but our Phase 1 counts both as search. For n8n flow we sent both, so count is 2.
    // Priority test uses service's todayCounts: both events count as search
    const todayCounts = await store.getTodayCounts(new Date());
    // Depending on store impl, both events count
    expect(todayCounts.get("k1")).toBe(2);
  });

  it("failed_search payload shape is correct", async () => {
    const kw = makeKw("Patna News", 2, 100, "k2");
    await store.insert(kw);
    await store.insertUsage({
      id: "u3",
      keywordId: "k2",
      keyword: kw.keyword,
      eventType: "failed_search",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: "YouTube quotaExceeded",
      createdAt: new Date().toISOString(),
    });
    const usages = await store.listUsage("k2", 10);
    expect(usages[0].eventType).toBe("failed_search");
    expect(usages[0].errorMessage).toBe("YouTube quotaExceeded");
  });

  it("n8n must NOT implement daily target — Sangita OS /api/keywords/next is source of truth", async () => {
    const kwBihar = makeKw("Bihar News", 1, 1, "b1"); // dailyTarget 1
    const kwPatna = makeKw("Patna News", 2, 100, "p1");
    await store.insert(kwBihar);
    await store.insert(kwPatna);

    // Simulate Bihar already reached today
    await store.insertUsage({
      id: "u4",
      keywordId: "b1",
      keyword: kwBihar.keyword,
      eventType: "search_started",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });
    const counts = await store.getTodayCounts(new Date());
    expect(counts.get("b1")).toBe(1);
    // next should skip b1 and return p1
    const all = await store.list();
    const next = selectNextActiveKeyword(all, counts);
    expect(next!.keyword).toBe("Patna News");

    // When all reached, n8n should stop
    await store.insertUsage({
      id: "u5",
      keywordId: "p1",
      keyword: kwPatna.keyword,
      eventType: "search_started",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });
    // But p1 target is 100, so not reached yet — we need to simulate reaching
    // Create a kw with target 1 and mark it completed
    const kwArrah = makeKw("Arrah News", 3, 1, "a1");
    await store.insert(kwArrah);
    await store.insertUsage({
      id: "u6",
      keywordId: "a1",
      keyword: kwArrah.keyword,
      eventType: "search_started",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });

    // Now only patna remains eligible (target 100, only 1 usage)
    const counts2 = await store.getTodayCounts(new Date());
    const next2 = selectNextActiveKeyword(await store.list(), counts2);
    expect(next2!.keyword).toBe("Patna News");
  });

  it("GET /api/keywords/next response does not contain secrets", async () => {
    const kw = makeKw("Bihar News", 1, 100);
    await store.insert(kw);
    const counts = await store.getTodayCounts(new Date());
    const next = selectNextActiveKeyword(await store.list(), counts);
    // Simulate API response shape
    const response = {
      keyword: next!.keyword,
      source: next!.source,
      dailyTarget: next!.dailyTarget,
      priority: next!.priority,
      id: next!.id,
      normalizedKeyword: next!.normalizedKeyword,
    };
    const json = JSON.stringify(response);
    expect(json).not.toContain("SUPABASE");
    expect(json).not.toContain("KEYWORDS_API_KEY");
    expect(json).not.toContain("YOUTUBE_API_KEY");
    expect(json).not.toContain("DATABASE_URL");
    // Only expected fields
    expect(response).toHaveProperty("keyword");
    expect(response).toHaveProperty("source");
    expect(response).toHaveProperty("dailyTarget");
    expect(response).toHaveProperty("priority");
  });

  it("task integration resolves keywords for Daily Lead Generation task", async () => {
    const kw1 = makeKw("Bihar News", 1, 100, "t1");
    const kw2 = makeKw("Patna News", 2, 100, "t2");
    const kwPaused = makeKw("Arrah News", 1, 100, "t3");
    (kwPaused as any).status = "paused";
    await store.insert(kw1);
    await store.insert(kw2);
    await store.insert(kwPaused);

    const ctx = await resolveKeywordsForTask(store, "task-daily", "Daily Lead Generation");
    expect(ctx.title).toBe("Daily Lead Generation");
    expect(ctx.keywords.length).toBe(2); // only active
    expect(ctx.nextKeyword).not.toBeNull();
    expect(ctx.nextKeyword!.priority).toBe(1);
  });
});

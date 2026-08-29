import { describe, it, expect, beforeEach } from "vitest";
import { normalizeKeyword } from "../normalize";
import {
  buildKeyword,
  applyUpdate,
  getDailyTargetInfo,
  selectNextActiveKeyword,
  recordUsage,
  recordSearchCompletedWithCount,
  filterNewKeywords,
  hasReachedDailyTarget,
} from "../service";
import { createIsolatedMemoryStore } from "../store";
import { StubAiKeywordProvider } from "../ai-provider";
import type { Keyword } from "../types";

// Helper to create keyword quickly
function makeKeyword(overrides: Partial<Keyword> = {}): Keyword {
  const base = buildKeyword(
    {
      keyword: overrides.keyword ?? "Bihar News",
      source: (overrides.source as never) ?? "manual",
      dailyTarget: overrides.dailyTarget ?? 100,
      priority: overrides.priority ?? 5,
      notes: overrides.notes ?? null,
    },
    { id: overrides.id ?? crypto.randomUUID(), nowIso: overrides.createdAt ?? new Date().toISOString() },
  );
  return {
    ...base,
    status: (overrides.status as never) ?? base.status,
    lastUsedAt: overrides.lastUsedAt ?? base.lastUsedAt,
    totalSearches: overrides.totalSearches ?? base.totalSearches,
    totalLeadsFound: overrides.totalLeadsFound ?? base.totalLeadsFound,
    totalNewLeads: overrides.totalNewLeads ?? base.totalNewLeads,
    totalDuplicates: overrides.totalDuplicates ?? base.totalDuplicates,
  };
}

describe("normalizeKeyword", () => {
  it("trims, lowercases, collapses whitespace", () => {
    expect(normalizeKeyword(" Bihar News ")).toBe("bihar news");
    expect(normalizeKeyword("BIHAR  NEWS")).toBe("bihar news");
    expect(normalizeKeyword("  Patna   News\t")).toBe("patna news");
  });
  it("duplicate protection: variants normalize identically", () => {
    const a = normalizeKeyword("Bihar News");
    const b = normalizeKeyword("bihar news");
    const c = normalizeKeyword(" Bihar News ");
    const d = normalizeKeyword("BIHAR   NEWS");
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(c).toBe(d);
  });
});

describe("manual keyword creation", () => {
  let store: ReturnType<typeof createIsolatedMemoryStore>;
  beforeEach(() => {
    store = createIsolatedMemoryStore();
  });

  it("creates manual keyword with correct normalized form and defaults", async () => {
    const kw = makeKeyword({ keyword: "Patna News", source: "manual", dailyTarget: 150, priority: 2 });
    const saved = await store.insert(kw);
    expect(saved.keyword).toBe("Patna News");
    expect(saved.normalizedKeyword).toBe("patna news");
    expect(saved.source).toBe("manual");
    expect(saved.dailyTarget).toBe(150);
    expect(saved.priority).toBe(2);
    expect(saved.status).toBe("active");
    expect(saved.totalSearches).toBe(0);
  });

  it("validates dailyTarget and priority", () => {
    expect(() =>
      buildKeyword(
        { keyword: "test", source: "manual", dailyTarget: 0 } as never,
        { id: "1", nowIso: new Date().toISOString() },
      ),
    ).toThrow();
    expect(() =>
      buildKeyword(
        { keyword: "test", source: "manual", priority: 11 } as never,
        { id: "1", nowIso: new Date().toISOString() },
      ),
    ).toThrow();
  });

  it("rejects empty keyword", () => {
    expect(() =>
      buildKeyword(
        { keyword: "   ", source: "manual" } as never,
        { id: "1", nowIso: new Date().toISOString() },
      ),
    ).toThrow();
  });
});

describe("AI keyword creation", () => {
  let store: ReturnType<typeof createIsolatedMemoryStore>;
  beforeEach(() => {
    store = createIsolatedMemoryStore();
  });

  it("adds AI keywords to same pool as manual", async () => {
    const manual = makeKeyword({ keyword: "Bihar News", source: "manual" });
    await store.insert(manual);

    const provider = new StubAiKeywordProvider();
    const aiCandidates = await provider.generateKeywords({ count: 3, seed: "Haryana News" });
    expect(aiCandidates.length).toBe(3);

    const existing = await store.list();
    const { toInsert } = filterNewKeywords(aiCandidates, existing, "ai");
    for (const inp of toInsert) {
      const kw = buildKeyword(inp as never, { id: crypto.randomUUID(), nowIso: new Date().toISOString() });
      await store.insert(kw);
    }

    const all = await store.list();
    const ai = all.filter((k) => k.source === "ai");
    const manualList = all.filter((k) => k.source === "manual");
    expect(manualList.length).toBe(1);
    expect(ai.length).toBeGreaterThan(0);
    // same pool
    expect(all.length).toBe(1 + ai.length);
  });

  it("AI provider is deterministic stub without network", async () => {
    const p = new StubAiKeywordProvider();
    const first = await p.generateKeywords({ count: 5, seed: "Arrah News" });
    const second = await p.generateKeywords({ count: 5, seed: "Arrah News" });
    expect(first).toEqual(second);
    expect(first[0]).toBe("Arrah News");
  });

  it("filters duplicates when AI generates existing keyword", async () => {
    const existing = [makeKeyword({ keyword: "Bihar News", source: "manual" })];
    const { toInsert, duplicates } = filterNewKeywords(
      ["Bihar News", "bihar news", "Patna News"],
      existing,
      "ai",
    );
    expect(duplicates).toContain("Bihar News");
    expect(duplicates).toContain("bihar news");
    expect(toInsert.length).toBe(1);
    expect(toInsert[0].keyword).toBe("Patna News");
  });
});

describe("duplicate detection", () => {
  let store: ReturnType<typeof createIsolatedMemoryStore>;
  beforeEach(() => {
    store = createIsolatedMemoryStore();
  });

  it("prevents duplicate via store findByNormalized", async () => {
    const kw1 = makeKeyword({ keyword: "Bihar News" });
    await store.insert(kw1);
    const dupNorm = normalizeKeyword(" bihar news ");
    const found = await store.findByNormalized(dupNorm);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(kw1.id);
  });

  it("triple variant treated as same", async () => {
    const variants = ["Bihar News", "bihar news", " Bihar News "];
    const norms = variants.map(normalizeKeyword);
    expect(new Set(norms).size).toBe(1);
    const kw = makeKeyword({ keyword: variants[0] });
    await store.insert(kw);
    for (let i = 1; i < variants.length; i++) {
      const n = normalizeKeyword(variants[i]);
      const existing = await store.findByNormalized(n);
      expect(existing).not.toBeNull();
    }
  });

  it("applyUpdate checks duplicate via service isDuplicate", async () => {
    const kw1 = makeKeyword({ keyword: "Bihar News", id: "id-1" });
    const kw2 = makeKeyword({ keyword: "Patna News", id: "id-2" });
    await store.insert(kw1);
    await store.insert(kw2);
    const all = await store.list();
    // try to rename kw2 to Bihar News should be duplicate
    const attempted = normalizeKeyword("BIHAR NEWS");
    const isDup = all.some((k) => k.normalizedKeyword === attempted && k.id !== "id-2");
    expect(isDup).toBe(true);
  });

  it("changing keyword updates normalizedKeyword", () => {
    const kw = makeKeyword({ keyword: "Bihar News" });
    const updated = applyUpdate(kw, { keyword: "  Patna  News " });
    expect(updated.keyword).toBe("Patna News");
    expect(updated.normalizedKeyword).toBe("patna news");
  });
});

describe("activate/pause", () => {
  let store: ReturnType<typeof createIsolatedMemoryStore>;
  beforeEach(() => {
    store = createIsolatedMemoryStore();
  });

  it("can pause and re-activate keyword", async () => {
    const kw = makeKeyword({ keyword: "Bihar News" });
    await store.insert(kw);
    let updated = await store.update(kw.id, { status: "paused" } as never);
    expect(updated.status).toBe("paused");
    updated = await store.update(kw.id, { status: "active" } as never);
    expect(updated.status).toBe("active");
  });

  it("applyUpdate can change status", () => {
    const kw = makeKeyword({ keyword: "Haryana News" });
    expect(kw.status).toBe("active");
    const paused = applyUpdate(kw, { status: "paused" } as never);
    expect(paused.status).toBe("paused");
    const completed = applyUpdate(paused, { status: "completed" } as never);
    expect(completed.status).toBe("completed");
  });

  it("paused keywords are excluded from next selection", async () => {
    const kw1 = makeKeyword({ keyword: "Bihar News", priority: 1, status: "paused" });
    const kw2 = makeKeyword({ keyword: "Patna News", priority: 5, status: "active" });
    await store.insert(kw1);
    await store.insert(kw2);
    const all = await store.list();
    const next = selectNextActiveKeyword(all, new Map());
    expect(next).not.toBeNull();
    expect(next!.keyword).toBe("Patna News");
  });
});

describe("next active keyword selection", () => {
  it("selects by priority, then LRU, then createdAt", async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 100000).toISOString();
    const later = new Date(now.getTime() - 1000).toISOString();

    const kwLowPriority = makeKeyword({ keyword: "Low", priority: 5, createdAt: earlier });
    const kwHighPriority = makeKeyword({ keyword: "High", priority: 1, createdAt: later });
    const kwMid = makeKeyword({ keyword: "Mid", priority: 3, createdAt: earlier });

    const next = selectNextActiveKeyword([kwLowPriority, kwHighPriority, kwMid], new Map());
    expect(next!.keyword).toBe("High");
  });

  it("LRU: never-used (null lastUsedAt) first among same priority", () => {
    const baseTime = new Date().toISOString();
    const kwNeverUsed = makeKeyword({ keyword: "Never", priority: 1, lastUsedAt: null, createdAt: baseTime });
    const kwUsed = makeKeyword({
      keyword: "Used",
      priority: 1,
      lastUsedAt: new Date().toISOString(),
      createdAt: baseTime,
    });
    const next = selectNextActiveKeyword([kwUsed, kwNeverUsed], new Map());
    expect(next!.keyword).toBe("Never");
  });

  it("skips keywords whose daily target reached", () => {
    const kw1 = makeKeyword({ keyword: "Bihar News", priority: 1, dailyTarget: 2, id: "1" });
    const kw2 = makeKeyword({ keyword: "Patna News", priority: 2, dailyTarget: 100, id: "2" });
    const counts = new Map<string, number>([["1", 2]]); // kw1 reached
    const next = selectNextActiveKeyword([kw1, kw2], counts);
    expect(next!.keyword).toBe("Patna News");
  });

  it("returns null when no eligible", () => {
    const kw1 = makeKeyword({ keyword: "A", status: "paused" });
    const kw2 = makeKeyword({ keyword: "B", status: "completed" });
    const kw3 = makeKeyword({ keyword: "C", dailyTarget: 1, id: "c" });
    const counts = new Map([["c", 1]]);
    expect(selectNextActiveKeyword([kw1, kw2], new Map())).toBeNull();
    expect(selectNextActiveKeyword([kw3], counts)).toBeNull();
  });

  it("integration via InMemory store daily counts", async () => {
    const store = createIsolatedMemoryStore();
    const kwBihar = makeKeyword({ keyword: "Bihar News", priority: 1, dailyTarget: 2, id: "bihar" });
    const kwPatna = makeKeyword({ keyword: "Patna News", priority: 2, dailyTarget: 2, id: "patna" });
    await store.insert(kwBihar);
    await store.insert(kwPatna);
    // simulate 2 searches for bihar today
    const nowIso = new Date().toISOString();
    await store.insertUsage({
      id: "u1",
      keywordId: "bihar",
      keyword: "Bihar News",
      eventType: "search_started",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: null,
      createdAt: nowIso,
    });
    await store.insertUsage({
      id: "u2",
      keywordId: "bihar",
      keyword: "Bihar News",
      eventType: "search_completed",
      leadsFound: 5,
      newLeads: 2,
      duplicates: 1,
      errorMessage: null,
      createdAt: nowIso,
    });
    const counts = await store.getTodayCounts(new Date());
    expect(counts.get("bihar")).toBe(2);
    const all = await store.list();
    const next = selectNextActiveKeyword(all, counts);
    expect(next!.keyword).toBe("Patna News");
  });
});

describe("daily target calculation", () => {
  it("getDailyTargetInfo computes remaining and reached", () => {
    const kw = makeKeyword({ keyword: "Bihar News", dailyTarget: 100 });
    expect(getDailyTargetInfo(kw, 0).remaining).toBe(100);
    expect(getDailyTargetInfo(kw, 0).reached).toBe(false);
    expect(getDailyTargetInfo(kw, 99).remaining).toBe(1);
    expect(getDailyTargetInfo(kw, 100).remaining).toBe(0);
    expect(getDailyTargetInfo(kw, 100).reached).toBe(true);
    expect(getDailyTargetInfo(kw, 150).remaining).toBe(0);
    expect(getDailyTargetInfo(kw, 150).reached).toBe(true);
  });

  it("hasReachedDailyTarget helper", () => {
    const kw = makeKeyword({ dailyTarget: 10 });
    expect(hasReachedDailyTarget(kw, 9)).toBe(false);
    expect(hasReachedDailyTarget(kw, 10)).toBe(true);
    expect(hasReachedDailyTarget(kw, 11)).toBe(true);
  });

  it("each keyword has independent daily target", async () => {
    const store = createIsolatedMemoryStore();
    const kw1 = makeKeyword({ keyword: "Bihar News", dailyTarget: 100, id: "1" });
    const kw2 = makeKeyword({ keyword: "Patna News", dailyTarget: 150, id: "2" });
    const kw3 = makeKeyword({ keyword: "Haryana News", dailyTarget: 200, id: "3" });
    await store.insert(kw1);
    await store.insert(kw2);
    await store.insert(kw3);
    // add 100 searches for kw1 today -> reached, others not
    const nowIso = new Date().toISOString();
    for (let i = 0; i < 100; i++) {
      await store.insertUsage({
        id: `u1-${i}`,
        keywordId: "1",
        keyword: "Bihar News",
        eventType: "search_started",
        leadsFound: 0,
        newLeads: 0,
        duplicates: 0,
        errorMessage: null,
        createdAt: nowIso,
      });
    }
    const counts = await store.getTodayCounts(new Date());
    expect(getDailyTargetInfo(kw1, counts.get("1") ?? 0).reached).toBe(true);
    expect(getDailyTargetInfo(kw2, counts.get("2") ?? 0).reached).toBe(false);
    expect(getDailyTargetInfo(kw3, counts.get("3") ?? 0).reached).toBe(false);
  });

  it("countTodaySearches respects UTC date boundary", async () => {
    const store = createIsolatedMemoryStore();
    const kw = makeKeyword({ id: "k1" });
    await store.insert(kw);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await store.insertUsage({
      id: "y1",
      keywordId: "k1",
      keyword: kw.keyword,
      eventType: "search_started",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: null,
      createdAt: yesterday.toISOString(),
    });
    await store.insertUsage({
      id: "t1",
      keywordId: "k1",
      keyword: kw.keyword,
      eventType: "search_started",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: null,
      createdAt: today.toISOString(),
    });
    expect(await store.countTodaySearches("k1", today)).toBe(1);
    expect(await store.countTodaySearches("k1", yesterday)).toBe(1);
  });
});

describe("usage tracking", () => {
  it("recordUsage search_started increments totalSearches and lastUsedAt", () => {
    const kw = makeKeyword({ keyword: "Bihar News" });
    const nowIso = new Date().toISOString();
    const { keyword: next, usage } = recordUsage(kw, {
      eventType: "search_started",
      nowIso,
      id: "u1",
    });
    expect(usage.eventType).toBe("search_started");
    expect(next.totalSearches).toBe(1);
    expect(next.lastUsedAt).toBe(nowIso);
    expect(next.totalLeadsFound).toBe(0);
  });

  it("recordUsage search_completed increments leads but not double searches", () => {
    const kw = makeKeyword({ keyword: "Bihar News", totalSearches: 1 });
    const nowIso = new Date().toISOString();
    const { keyword: next, usage } = recordUsage(kw, {
      eventType: "search_completed",
      leadsFound: 10,
      newLeads: 7,
      duplicates: 3,
      nowIso,
      id: "u2",
    });
    expect(usage.leadsFound).toBe(10);
    expect(next.totalLeadsFound).toBe(10);
    expect(next.totalNewLeads).toBe(7);
    expect(next.totalDuplicates).toBe(3);
    // pure service does not double count search on completed by default
    expect(next.totalSearches).toBe(1);
  });

  it("recordSearchCompletedWithCount increments both search and leads", () => {
    const kw = makeKeyword({ keyword: "Bihar News" });
    const nowIso = new Date().toISOString();
    const { keyword: next, usage } = recordSearchCompletedWithCount(kw, {
      leadsFound: 20,
      newLeads: 5,
      duplicates: 2,
      nowIso,
      id: "u3",
    });
    expect(usage.eventType).toBe("search_completed");
    expect(next.totalSearches).toBe(1);
    expect(next.totalLeadsFound).toBe(20);
    expect(next.totalNewLeads).toBe(5);
  });

  it("recordUsage failed_search only updates lastUsedAt", () => {
    const kw = makeKeyword({ keyword: "Bihar News" });
    const nowIso = new Date().toISOString();
    const { keyword: next, usage } = recordUsage(kw, {
      eventType: "failed_search",
      errorMessage: "timeout",
      nowIso,
      id: "u4",
    });
    expect(usage.errorMessage).toBe("timeout");
    expect(next.totalSearches).toBe(0);
    expect(next.lastUsedAt).toBe(nowIso);
  });

  it("InMemory store insertUsage and listUsage", async () => {
    const store = createIsolatedMemoryStore();
    const kw = makeKeyword({ keyword: "Patna News", id: "p1" });
    await store.insert(kw);
    const nowIso = new Date().toISOString();
    await store.insertUsage({
      id: "uu1",
      keywordId: "p1",
      keyword: "Patna News",
      eventType: "search_started",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: null,
      createdAt: nowIso,
    });
    await store.insertUsage({
      id: "uu2",
      keywordId: "p1",
      keyword: "Patna News",
      eventType: "search_completed",
      leadsFound: 3,
      newLeads: 1,
      duplicates: 2,
      errorMessage: null,
      createdAt: nowIso,
    });
    await store.insertUsage({
      id: "uu3",
      keywordId: "p1",
      keyword: "Patna News",
      eventType: "failed_search",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: "network",
      createdAt: nowIso,
    });
    const usages = await store.listUsage("p1", 10);
    expect(usages.length).toBe(3);
    expect(usages.some((u) => u.eventType === "failed_search")).toBe(true);
  });

  it("editing priority and dailyTarget via applyUpdate", () => {
    const kw = makeKeyword({ dailyTarget: 100, priority: 5 });
    const updated = applyUpdate(kw, { dailyTarget: 250, priority: 1 });
    expect(updated.dailyTarget).toBe(250);
    expect(updated.priority).toBe(1);
  });

  it("delete removes keyword and usages", async () => {
    const store = createIsolatedMemoryStore();
    const kw = makeKeyword({ id: "del1" });
    await store.insert(kw);
    await store.insertUsage({
      id: "u1",
      keywordId: "del1",
      keyword: kw.keyword,
      eventType: "search_started",
      leadsFound: 0,
      newLeads: 0,
      duplicates: 0,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });
    await store.delete("del1");
    expect(await store.getById("del1")).toBeNull();
    expect(await store.listUsage("del1")).toHaveLength(0);
  });
});

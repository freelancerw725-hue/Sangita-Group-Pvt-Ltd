import { describe, it, expect, vi, beforeEach } from "vitest";
import { InMemoryKeywordIntelligenceStore, createIsolatedMemoryStore } from "../store";
import type {
  RegionConfig,
  KeywordTemplate,
  IntelligenceConfig,
  DailyRunResult,
  SelectedKeyword,
} from "../service";

describe("InMemoryKeywordIntelligenceStore", () => {
  let store: InMemoryKeywordIntelligenceStore;

  beforeEach(() => {
    store = createIsolatedMemoryStore();
  });

  const mockRegion: RegionConfig = {
    regionCode: "BR",
    regionName: "Bihar",
    displayOrder: 1,
    keywordTemplates: ["{region} News"],
    businessCategories: ["Business"],
    cityModifiers: ["Patna"],
    languageModifiers: ["हिंदी"],
    maxKeywordsPerDay: 20,
    minKeywordsPerDay: 5,
    performanceWeight: 1.0,
    isActive: true,
  };

  const mockTemplate: KeywordTemplate = {
    id: "tmpl-1",
    name: "Test Template",
    description: "Test",
    regionCode: "BR",
    basePatterns: ["{region} News"],
    categoryModifiers: ["Business"],
    cityModifiers: ["Patna"],
    languageModifiers: ["हिंदी"],
    suffixes: ["Live"],
    maxCombinationsPerRun: 10,
    priority: 3,
    sourceTag: "generated",
    isActive: true,
  };

  describe("Regions", () => {
    it("should upsert and retrieve region", async () => {
      const saved = await store.upsertRegion(mockRegion);
      expect(saved.regionCode).toBe("BR");

      const retrieved = await store.getRegion("BR");
      expect(retrieved?.regionName).toBe("Bihar");
    });

    it("should list regions sorted by displayOrder", async () => {
      await store.upsertRegion({ ...mockRegion, regionCode: "UP", displayOrder: 2 });
      await store.upsertRegion(mockRegion);

      const regions = await store.listRegions();
      expect(regions[0].regionCode).toBe("BR");
      expect(regions[1].regionCode).toBe("UP");
    });

    it("should toggle region active status", async () => {
      await store.upsertRegion(mockRegion);
      await store.setRegionActive("BR", false);
      const region = await store.getRegion("BR");
      expect(region?.isActive).toBe(false);
    });
  });

  describe("Templates", () => {
    it("should upsert and retrieve template", async () => {
      const saved = await store.upsertTemplate(mockTemplate);
      expect(saved.id).toBe("tmpl-1");

      const retrieved = await store.getTemplate("tmpl-1");
      expect(retrieved?.name).toBe("Test Template");
    });

    it("should filter templates by region", async () => {
      await store.upsertTemplate({ ...mockTemplate, id: "tmpl-global", regionCode: null });
      await store.upsertTemplate({ ...mockTemplate, id: "tmpl-br", regionCode: "BR" });
      await store.upsertTemplate({ ...mockTemplate, id: "tmpl-up", regionCode: "UP" });

      // No filter = all templates
      const all = await store.listTemplates();
      expect(all.length).toBe(3);

      // Filter by BR = global + BR
      const brOnly = await store.listTemplates("BR");
      expect(brOnly.length).toBe(2);

      // Filter by UP = global + UP
      const upOnly = await store.listTemplates("UP");
      expect(upOnly.length).toBe(2);
    });

    it("should delete template", async () => {
      await store.upsertTemplate(mockTemplate);
      await store.deleteTemplate("tmpl-1");
      const retrieved = await store.getTemplate("tmpl-1");
      expect(retrieved).toBeNull();
    });
  });

  describe("Config", () => {
    it("should get default config", async () => {
      const config = await store.getConfig();
      expect(config.rotationMode).toBe("sequential");
      expect(config.analysisWindowDays).toBe(30);
    });

    it("should set and get config", async () => {
      await store.setConfig("rotationMode", "performance");
      const config = await store.getConfig();
      expect(config.rotationMode).toBe("performance");
    });

    it("should bulk set config", async () => {
      await store.bulkSetConfig([
        { key: "rotationMode", value: "manual" },
        { key: "fixedRegionCode", value: "MH" },
        { key: "maxKeywordsPerRegionPerDay", value: 15 },
      ]);
      const config = await store.getConfig();
      expect(config.rotationMode).toBe("manual");
      expect(config.fixedRegionCode).toBe("MH");
      expect(config.maxKeywordsPerRegionPerDay).toBe(15);
    });
  });

  describe("Daily Runs", () => {
    const mockRun: DailyRunResult = {
      runId: "run-1",
      runDate: "2026-08-31",
      regionCode: "BR",
      regionName: "Bihar",
      status: "pending",
      selectedKeywords: [
        {
          keywordId: "kw-1",
          keyword: "Bihar News",
          normalizedKeyword: "bihar news",
          source: "manual",
          priority: 5,
          dailyTarget: 100,
          selectionReason: "Test",
          performanceScore: 50,
          regionRank: 1,
          templateId: null,
        },
      ],
      totalKeywordsSelected: 1,
      configSnapshot: {
        regionCode: "BR",
        regionName: "Bihar",
        rotationMode: "sequential",
        analysisWindowDays: 30,
        maxKeywords: 20,
        minKeywords: 5,
        duplicationAvoidanceDays: 14,
        performanceWeights: {},
        templatesUsed: [],
      },
    };

    it("should create and retrieve daily run", async () => {
      const created = await store.createDailyRun(mockRun);
      expect(created.runId).toBe("run-1");

      const byId = await store.getDailyRun("run-1");
      expect(byId?.runId).toBe("run-1");

      const byDate = await store.getDailyRunByDate("2026-08-31");
      expect(byDate?.runId).toBe("run-1");
    });

    it("should update daily run", async () => {
      await store.createDailyRun(mockRun);
      const updated = await store.updateDailyRun("run-1", {
        status: "completed",
        totalSearchesInitiated: 10,
      });
      expect(updated.status).toBe("completed");
      expect(updated.totalSearchesInitiated).toBe(10);
    });

    it("should list runs sorted by date desc", async () => {
      await store.createDailyRun({ ...mockRun, runId: "run-1", runDate: "2026-08-30" });
      await store.createDailyRun({ ...mockRun, runId: "run-2", runDate: "2026-08-31" });

      const runs = await store.listDailyRuns();
      expect(runs[0].runDate).toBe("2026-08-31");
      expect(runs[1].runDate).toBe("2026-08-30");
    });
  });

  describe("Daily Selections", () => {
    const mockSelections: SelectedKeyword[] = [
      {
        keywordId: "kw-1",
        keyword: "Bihar News",
        normalizedKeyword: "bihar news",
        source: "manual",
        priority: 5,
        dailyTarget: 100,
        selectionReason: "Test",
        performanceScore: 50,
        regionRank: 1,
        templateId: null,
      },
    ];

    it("should insert and retrieve selections", async () => {
      await store.insertDailySelections(mockSelections, "run-1");
      const selections = await store.getDailySelections("run-1");
      expect(selections.length).toBe(1);
      expect(selections[0].keyword).toBe("Bihar News");
    });
  });

  describe("Performance", () => {
    it("should upsert and retrieve performance", async () => {
      const perf = {
        keywordId: "kw-1",
        keyword: "Bihar News",
        normalizedKeyword: "bihar news",
        totalSearches: 10,
        totalLeadsFound: 5,
        totalNewLeads: 3,
        leadRate: 0.5,
        newLeadRate: 0.3,
        performanceScore: 75,
        regionRank: 1,
      };

      await store.upsertKeywordPerformance(perf);
      const all = await store.getKeywordPerformance("BR", 30);
      expect(all.length).toBe(1);
      expect(all[0].performanceScore).toBe(75);
    });
  });
});

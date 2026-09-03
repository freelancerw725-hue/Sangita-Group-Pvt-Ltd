import { describe, it, expect, vi } from "vitest";
import {
  validateIntelligenceConfig,
  getNextRegion,
  generateKeywordsFromTemplates,
  calculatePerformanceScore,
  computeKeywordMetrics,
  selectDailyKeywords,
  orchestrateDailyRun,
  buildRegionConfig,
  buildKeywordTemplate,
  buildIntelligenceConfig,
  IntelligenceValidationError,
  NoEligibleRegionError,
} from "../service";
import type {
  RegionConfig,
  KeywordTemplate,
  IntelligenceConfig,
  Keyword,
  KeywordPerformance,
} from "../service";

// Mock data
const mockRegion: RegionConfig = {
  regionCode: "BR",
  regionName: "Bihar",
  displayOrder: 1,
  keywordTemplates: ["{region} News", "{region} {category}"],
  businessCategories: ["Business", "Politics", "Education"],
  cityModifiers: ["Patna", "Gaya"],
  languageModifiers: ["हिंदी", "English"],
  maxKeywordsPerDay: 20,
  minKeywordsPerDay: 5,
  performanceWeight: 1.0,
  isActive: true,
};

const mockTemplate: KeywordTemplate = {
  id: "tmpl-1",
  name: "Bihar Local",
  description: "Bihar-specific patterns",
  regionCode: "BR",
  basePatterns: ["{region} News", "{city} {category}"],
  categoryModifiers: ["Business", "Politics"],
  cityModifiers: ["Patna"],
  languageModifiers: ["हिंदी"],
  suffixes: ["Live", "Updates"],
  maxCombinationsPerRun: 10,
  priority: 3,
  sourceTag: "generated",
  isActive: true,
};

const mockConfig: IntelligenceConfig = {
  rotationMode: "sequential",
  fixedRegionCode: null,
  analysisWindowDays: 30,
  minPerformanceScore: 10,
  performanceScoreWeights: {
    leadRate: 0.25,
    newLeadRate: 0.25,
    verificationRate: 0.15,
    approvalRate: 0.15,
    replyRate: 0.1,
    conversionRate: 0.1,
  },
  duplicationAvoidanceDays: 14,
  maxKeywordsPerRegionPerDay: 20,
  minKeywordsPerRegionPerDay: 5,
  autoGenerateKeywords: true,
  leadFinderBatchSize: 10,
  enableLeadFinderIntegration: true,
  notificationOnFailure: true,
};

const mockPoolKeyword: Keyword = {
  id: "kw-1",
  keyword: "Bihar News",
  normalizedKeyword: "bihar news",
  source: "manual",
  status: "active",
  dailyTarget: 100,
  priority: 5,
  createdAt: new Date().toISOString(),
  lastUsedAt: null,
  totalSearches: 10,
  totalLeadsFound: 5,
  totalNewLeads: 3,
  totalDuplicates: 2,
  notes: null,
};

describe("Keyword Intelligence Service", () => {
  describe("validateIntelligenceConfig", () => {
    it("should return defaults when no config provided", () => {
      const result = validateIntelligenceConfig({});
      expect(result.rotationMode).toBe("sequential");
      expect(result.analysisWindowDays).toBe(30);
      expect(result.maxKeywordsPerRegionPerDay).toBe(20);
    });

    it("should validate rotationMode", () => {
      expect(() => validateIntelligenceConfig({ rotationMode: "invalid" })).toThrow(
        IntelligenceValidationError,
      );
      expect(() => validateIntelligenceConfig({ rotationMode: "performance" })).not.toThrow();
      expect(() => validateIntelligenceConfig({ rotationMode: "manual" })).not.toThrow();
    });

    it("should validate analysisWindowDays", () => {
      expect(() => validateIntelligenceConfig({ analysisWindowDays: 0 })).toThrow(
        IntelligenceValidationError,
      );
      expect(() => validateIntelligenceConfig({ analysisWindowDays: 366 })).toThrow(
        IntelligenceValidationError,
      );
      expect(() => validateIntelligenceConfig({ analysisWindowDays: 30 })).not.toThrow();
    });

    it("should validate performanceScoreWeights sum to 1", () => {
      expect(() =>
        validateIntelligenceConfig({
          performanceScoreWeights: {
            leadRate: 0.5,
            newLeadRate: 0.5,
            verificationRate: 0,
            approvalRate: 0,
            replyRate: 0,
            conversionRate: 0,
          },
        }),
      ).not.toThrow();

      expect(() =>
        validateIntelligenceConfig({
          performanceScoreWeights: {
            leadRate: 0.5,
            newLeadRate: 0.5,
            verificationRate: 0.1,
            approvalRate: 0,
            replyRate: 0,
            conversionRate: 0,
          },
        }),
      ).toThrow(IntelligenceValidationError);
    });

    it("should require fixedRegionCode for manual mode", () => {
      const config = validateIntelligenceConfig({ rotationMode: "manual", fixedRegionCode: "BR" });
      expect(config.fixedRegionCode).toBe("BR");
    });
  });

  describe("getNextRegion", () => {
    const regions = [
      { ...mockRegion, regionCode: "BR", displayOrder: 1 },
      { ...mockRegion, regionCode: "UP", displayOrder: 2 },
      { ...mockRegion, regionCode: "MH", displayOrder: 3 },
    ];

    it("should return first region when no current region", () => {
      const result = getNextRegion(regions, null, mockConfig);
      expect(result?.regionCode).toBe("BR");
    });

    it("should rotate sequentially", () => {
      const result1 = getNextRegion(regions, "BR", mockConfig);
      expect(result1?.regionCode).toBe("UP");

      const result2 = getNextRegion(regions, "UP", mockConfig);
      expect(result2?.regionCode).toBe("MH");

      const result3 = getNextRegion(regions, "MH", mockConfig);
      expect(result3?.regionCode).toBe("BR");
    });

    it("should return fixed region in manual mode", () => {
      const manualConfig = {
        ...mockConfig,
        rotationMode: "manual" as const,
        fixedRegionCode: "MH",
      };
      const result = getNextRegion(regions, "BR", manualConfig);
      expect(result?.regionCode).toBe("MH");
    });

    it("should throw for manual mode without fixed region", () => {
      const manualConfig = {
        ...mockConfig,
        rotationMode: "manual" as const,
        fixedRegionCode: null,
      };
      expect(() => getNextRegion(regions, "BR", manualConfig)).toThrow(IntelligenceValidationError);
    });

    it("should skip inactive regions", () => {
      const inactiveRegions = regions.map((r) =>
        r.regionCode === "UP" ? { ...r, isActive: false } : r,
      );
      const result = getNextRegion(inactiveRegions, "BR", mockConfig);
      expect(result?.regionCode).toBe("MH");
    });
  });

  describe("generateKeywordsFromTemplates", () => {
    it("should generate keywords from templates", () => {
      const existingKeywords = new Set<string>(); // Don't pre-filter to allow region keywords
      const results = generateKeywordsFromTemplates(
        [mockTemplate],
        mockRegion,
        existingKeywords,
        20,
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.source === "generated")).toBe(true);
      expect(results.every((r) => r.templateId === "tmpl-1")).toBe(true);
      // At least one keyword should contain the region name
      expect(results.some((r) => r.keyword.includes("Bihar"))).toBe(true);
    });

    it("should avoid duplicates with existing keywords", () => {
      const existingKeywords = new Set<string>(["bihar news", "patna business"]);
      const results = generateKeywordsFromTemplates(
        [mockTemplate],
        mockRegion,
        existingKeywords,
        20,
      );

      const norms = results.map((r) => r.keyword.toLowerCase().trim().replace(/\s+/g, " "));
      expect(norms).not.toContain("bihar news");
      expect(norms).not.toContain("patna business");
    });

    it("should respect maxTotal limit", () => {
      const existingKeywords = new Set<string>();
      const results = generateKeywordsFromTemplates(
        [mockTemplate],
        mockRegion,
        existingKeywords,
        3,
      );
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should respect template maxCombinationsPerRun", () => {
      const limitedTemplate = { ...mockTemplate, maxCombinationsPerRun: 2 };
      const existingKeywords = new Set<string>();
      const results = generateKeywordsFromTemplates(
        [limitedTemplate],
        mockRegion,
        existingKeywords,
        20,
      );
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("calculatePerformanceScore", () => {
    it("should calculate weighted score correctly", () => {
      const metrics = {
        leadRate: 0.5,
        newLeadRate: 0.3,
        verificationRate: 0.8,
        approvalRate: 0.6,
        replyRate: 0.4,
        conversionRate: 0.2,
      };
      const score = calculatePerformanceScore(metrics, mockConfig.performanceScoreWeights);
      // (0.5*0.25 + 0.3*0.25 + 0.8*0.15 + 0.6*0.15 + 0.4*0.1 + 0.2*0.1) * 100
      // = (0.125 + 0.075 + 0.12 + 0.09 + 0.04 + 0.02) * 100
      // = 0.47 * 100 = 47
      expect(score).toBe(47);
    });

    it("should clamp score to 0-100", () => {
      const maxMetrics = {
        leadRate: 1,
        newLeadRate: 1,
        verificationRate: 1,
        approvalRate: 1,
        replyRate: 1,
        conversionRate: 1,
      };
      expect(calculatePerformanceScore(maxMetrics, mockConfig.performanceScoreWeights)).toBe(100);

      const zeroMetrics = {
        leadRate: 0,
        newLeadRate: 0,
        verificationRate: 0,
        approvalRate: 0,
        replyRate: 0,
        conversionRate: 0,
      };
      expect(calculatePerformanceScore(zeroMetrics, mockConfig.performanceScoreWeights)).toBe(0);
    });
  });

  describe("computeKeywordMetrics", () => {
    it("should compute rates from usage logs and lead stats", () => {
      const usageLogs = [
        { eventType: "search_started", leadsFound: 10, newLeads: 5, duplicates: 2 },
        { eventType: "search_completed", leadsFound: 8, newLeads: 3, duplicates: 1 },
        { eventType: "search_started", leadsFound: 5, newLeads: 2, duplicates: 1 },
      ];
      const leadStats = {
        totalVerifiedValid: 7,
        totalApproved: 5,
        totalContacted: 10,
        totalReplied: 3,
        totalInterested: 2,
        totalCustomers: 1,
        totalNewLeads: 10,
      };

      const metrics = computeKeywordMetrics(usageLogs, leadStats);

      expect(metrics.leadRate).toBeCloseTo(23 / 3, 2); // (10+8+5) / 3 searches
      expect(metrics.newLeadRate).toBeCloseTo(10 / 3, 2); // (5+3+2) / 3 searches
      expect(metrics.verificationRate).toBeCloseTo(7 / 10, 2);
      expect(metrics.approvalRate).toBeCloseTo(5 / 7, 2);
      expect(metrics.replyRate).toBeCloseTo(3 / 10, 2);
      expect(metrics.conversionRate).toBeCloseTo(1 / 10, 2);
    });

    it("should handle zero searches gracefully", () => {
      const metrics = computeKeywordMetrics([], {
        totalVerifiedValid: 0,
        totalApproved: 0,
        totalContacted: 0,
        totalReplied: 0,
        totalInterested: 0,
        totalCustomers: 0,
        totalNewLeads: 0,
      });
      expect(metrics.leadRate).toBe(0);
      expect(metrics.newLeadRate).toBe(0);
    });
  });

  describe("selectDailyKeywords", () => {
    it("should prioritize high-performance pool keywords", () => {
      const perfMap = new Map<string, KeywordPerformance>([
        [
          "kw-1",
          {
            keywordId: "kw-1",
            keyword: "Bihar News",
            normalizedKeyword: "bihar news",
            totalSearches: 10,
            totalLeadsFound: 5,
            totalNewLeads: 3,
            leadRate: 0.5,
            newLeadRate: 0.3,
            performanceScore: 80,
            regionRank: 1,
          },
        ],
      ]);
      const recentNorms = new Set<string>();

      const selected = selectDailyKeywords({
        region: mockRegion,
        poolKeywords: [mockPoolKeyword],
        generatedKeywords: [],
        keywordPerformance: perfMap,
        recentKeywordNorms: recentNorms,
        config: mockConfig,
        todayCounts: new Map(),
      });

      expect(selected.length).toBe(1);
      expect(selected[0].keywordId).toBe("kw-1");
      expect(selected[0].selectionReason).toContain("High performer");
    });

    it("should fill remaining slots with generated keywords", () => {
      const perfMap = new Map<string, KeywordPerformance>();
      const recentNorms = new Set<string>();

      const genKeywords = [
        {
          keyword: "Bihar Business News",
          templateId: "tmpl-1",
          source: "generated" as const,
          priority: 3,
        },
        {
          keyword: "Patna Politics Today",
          templateId: "tmpl-1",
          source: "generated" as const,
          priority: 3,
        },
      ];

      const selected = selectDailyKeywords({
        region: mockRegion,
        poolKeywords: [],
        generatedKeywords: genKeywords,
        keywordPerformance: perfMap,
        recentKeywordNorms: recentNorms,
        config: { ...mockConfig, maxKeywordsPerRegionPerDay: 5 },
        todayCounts: new Map(),
      });

      expect(selected.length).toBe(2);
      expect(selected.every((s) => s.source === "generated")).toBe(true);
    });

    it("should avoid recently used keywords", () => {
      const recentNorms = new Set<string>(["bihar news"]);
      const perfMap = new Map<string, KeywordPerformance>();

      const selected = selectDailyKeywords({
        region: mockRegion,
        poolKeywords: [mockPoolKeyword],
        generatedKeywords: [],
        keywordPerformance: perfMap,
        recentKeywordNorms: recentNorms,
        config: mockConfig,
        todayCounts: new Map(),
      });

      expect(selected.length).toBe(0);
    });

    it("should respect daily target limits", () => {
      const perfMap = new Map<string, KeywordPerformance>();
      const recentNorms = new Set<string>();
      const todayCounts = new Map<string, number>([["kw-1", 100]]); // At daily target

      const selected = selectDailyKeywords({
        region: mockRegion,
        poolKeywords: [mockPoolKeyword],
        generatedKeywords: [],
        keywordPerformance: perfMap,
        recentKeywordNorms: recentNorms,
        config: mockConfig,
        todayCounts,
      });

      expect(selected.length).toBe(0);
    });
  });

  describe("orchestrateDailyRun", () => {
    it("should create a complete run with selected keywords", () => {
      const input = {
        runDate: new Date(),
        regions: [mockRegion],
        templates: [mockTemplate],
        poolKeywords: [mockPoolKeyword],
        keywordPerformance: new Map(),
        recentKeywordNorms: new Set(),
        config: mockConfig,
        todayCounts: new Map(),
        previousRuns: [],
      };

      const { run, leadFinderPayloads } = orchestrateDailyRun(input);

      expect(run.runId).toBeDefined();
      expect(run.regionCode).toBe("BR");
      expect(run.regionName).toBe("Bihar");
      expect(run.selectedKeywords.length).toBeGreaterThan(0);
      expect(run.configSnapshot.regionCode).toBe("BR");
      expect(leadFinderPayloads.length).toBe(run.selectedKeywords.length);
    });

    it("should throw when no eligible region", () => {
      const input = {
        runDate: new Date(),
        regions: [{ ...mockRegion, isActive: false }],
        templates: [mockTemplate],
        poolKeywords: [],
        keywordPerformance: new Map(),
        recentKeywordNorms: new Set(),
        config: mockConfig,
        todayCounts: new Map(),
        previousRuns: [],
      };

      expect(() => orchestrateDailyRun(input)).toThrow(NoEligibleRegionError);
    });
  });

  describe("buildRegionConfig", () => {
    it("should transform DB row to RegionConfig", () => {
      const row = {
        region_code: "BR",
        region_name: "Bihar",
        display_order: 1,
        keyword_templates: ["{region} News"],
        business_categories: ["Business"],
        city_modifiers: ["Patna"],
        language_modifiers: ["हिंदी"],
        max_keywords_per_day: 20,
        min_keywords_per_day: 5,
        performance_weight: 1.0,
        is_active: true,
      };

      const config = buildRegionConfig(row);
      expect(config.regionCode).toBe("BR");
      expect(config.regionName).toBe("Bihar");
      expect(config.displayOrder).toBe(1);
    });
  });

  describe("buildKeywordTemplate", () => {
    it("should transform DB row to KeywordTemplate", () => {
      const row = {
        id: "tmpl-1",
        name: "Test Template",
        description: "Test",
        region_code: "BR",
        base_patterns: ["{region} News"],
        category_modifiers: ["Business"],
        city_modifiers: ["Patna"],
        language_modifiers: ["हिंदी"],
        suffixes: ["Live"],
        max_combinations_per_run: 10,
        priority: 3,
        source_tag: "generated",
        is_active: true,
      };

      const template = buildKeywordTemplate(row);
      expect(template.id).toBe("tmpl-1");
      expect(template.name).toBe("Test Template");
      expect(template.regionCode).toBe("BR");
    });
  });

  describe("buildIntelligenceConfig", () => {
    it("should build config from DB rows", () => {
      const rows = [
        { config_key: "rotation_mode", config_value: "sequential" },
        { config_key: "analysis_window_days", config_value: 30 },
        { config_key: "max_keywords_per_region_per_day", config_value: 20 },
      ];

      const config = buildIntelligenceConfig(rows);
      expect(config.rotationMode).toBe("sequential");
      expect(config.analysisWindowDays).toBe(30);
      expect(config.maxKeywordsPerRegionPerDay).toBe(20);
    });
  });
});

import { createFileRoute } from "@tanstack/react-router";
import { getKeywordIntelligenceStore } from "@/lib/keyword-intelligence/store";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/regions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const store = getKeywordIntelligenceStore();
          const regions = await store.listRegions();
          return json({ regions, total: regions.length });
        } catch (e) {
          console.error("[keyword-intelligence/regions GET]", e);
          return errorJson("Failed to list regions", 500);
        }
      },
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") {
            return errorJson("Invalid request body", 400);
          }

          const required = ["regionCode", "regionName", "displayOrder"];
          for (const field of required) {
            if (body[field] === undefined) {
              return errorJson(`Missing required field: ${field}`, 400);
            }
          }

          const store = getKeywordIntelligenceStore();

          // Check if region code already exists
          const existing = await store.getRegion(body.regionCode);
          if (existing) {
            return errorJson(`Region ${body.regionCode} already exists`, 409);
          }

          const region = {
            regionCode: body.regionCode,
            regionName: body.regionName,
            displayOrder: Number(body.displayOrder),
            keywordTemplates: Array.isArray(body.keywordTemplates) ? body.keywordTemplates : [],
            businessCategories: Array.isArray(body.businessCategories)
              ? body.businessCategories
              : [],
            cityModifiers: Array.isArray(body.cityModifiers) ? body.cityModifiers : [],
            languageModifiers: Array.isArray(body.languageModifiers) ? body.languageModifiers : [],
            maxKeywordsPerDay: Number(body.maxKeywordsPerDay) || 20,
            minKeywordsPerDay: Number(body.minKeywordsPerDay) || 5,
            performanceWeight: Number(body.performanceWeight) || 1.0,
            isActive: body.isActive !== false,
          };

          const saved = await store.upsertRegion(region);
          return json({ region: saved }, { status: 201 });
        } catch (e) {
          console.error("[keyword-intelligence/regions POST]", e);
          return errorJson("Failed to create region", 500);
        }
      },
    },
  },
});

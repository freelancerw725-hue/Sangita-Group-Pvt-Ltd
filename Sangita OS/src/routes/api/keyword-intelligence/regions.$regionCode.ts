import { createFileRoute } from "@tanstack/react-router";
import { getKeywordIntelligenceStore } from "@/lib/keyword-intelligence/store";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/regions/$regionCode")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") {
            return errorJson("Invalid request body", 400);
          }

          const { regionCode } = params;
          const store = getKeywordIntelligenceStore();

          const existing = await store.getRegion(regionCode);
          if (!existing) {
            return errorJson("Region not found", 404);
          }

          // Handle special actions
          if (body.action === "activate" || body.action === "deactivate") {
            await store.setRegionActive(regionCode, body.action === "activate");
            const updated = await store.getRegion(regionCode);
            return json({ region: updated });
          }

          if (body.action === "reorder" && typeof body.displayOrder === "number") {
            await store.updateRegionOrder(regionCode, body.displayOrder);
            const updated = await store.getRegion(regionCode);
            return json({ region: updated });
          }

          // Regular update
          const updated = await store.upsertRegion({
            ...existing,
            regionName: body.regionName ?? existing.regionName,
            displayOrder:
              typeof body.displayOrder === "number" ? body.displayOrder : existing.displayOrder,
            keywordTemplates: Array.isArray(body.keywordTemplates)
              ? body.keywordTemplates
              : existing.keywordTemplates,
            businessCategories: Array.isArray(body.businessCategories)
              ? body.businessCategories
              : existing.businessCategories,
            cityModifiers: Array.isArray(body.cityModifiers)
              ? body.cityModifiers
              : existing.cityModifiers,
            languageModifiers: Array.isArray(body.languageModifiers)
              ? body.languageModifiers
              : existing.languageModifiers,
            maxKeywordsPerDay:
              typeof body.maxKeywordsPerDay === "number"
                ? body.maxKeywordsPerDay
                : existing.maxKeywordsPerDay,
            minKeywordsPerDay:
              typeof body.minKeywordsPerDay === "number"
                ? body.minKeywordsPerDay
                : existing.minKeywordsPerDay,
            performanceWeight:
              typeof body.performanceWeight === "number"
                ? body.performanceWeight
                : existing.performanceWeight,
            isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
          });

          return json({ region: updated });
        } catch (e) {
          console.error("[keyword-intelligence/regions/$regionCode PATCH]", e);
          return errorJson("Failed to update region", 500);
        }
      },
      DELETE: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const { regionCode } = params;
          const store = getKeywordIntelligenceStore();

          const existing = await store.getRegion(regionCode);
          if (!existing) {
            return errorJson("Region not found", 404);
          }

          // Soft delete by deactivating
          await store.setRegionActive(regionCode, false);
          return json({ message: "Region deactivated" });
        } catch (e) {
          console.error("[keyword-intelligence/regions/$regionCode DELETE]", e);
          return errorJson("Failed to delete region", 500);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { getKeywordIntelligenceStore } from "@/lib/keyword-intelligence/store";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/templates/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") {
            return errorJson("Invalid request body", 400);
          }

          const { id } = params;
          const store = getKeywordIntelligenceStore();

          const existing = await store.getTemplate(id);
          if (!existing) {
            return errorJson("Template not found", 404);
          }

          const updated = await store.upsertTemplate({
            ...existing,
            name: body.name ?? existing.name,
            description: body.description ?? existing.description,
            regionCode: body.regionCode ?? existing.regionCode,
            basePatterns: Array.isArray(body.basePatterns)
              ? body.basePatterns
              : existing.basePatterns,
            categoryModifiers: Array.isArray(body.categoryModifiers)
              ? body.categoryModifiers
              : existing.categoryModifiers,
            cityModifiers: Array.isArray(body.cityModifiers)
              ? body.cityModifiers
              : existing.cityModifiers,
            languageModifiers: Array.isArray(body.languageModifiers)
              ? body.languageModifiers
              : existing.languageModifiers,
            suffixes: Array.isArray(body.suffixes) ? body.suffixes : existing.suffixes,
            maxCombinationsPerRun:
              typeof body.maxCombinationsPerRun === "number"
                ? body.maxCombinationsPerRun
                : existing.maxCombinationsPerRun,
            priority: typeof body.priority === "number" ? body.priority : existing.priority,
            sourceTag: body.sourceTag ?? existing.sourceTag,
            isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
          });

          return json({ template: updated });
        } catch (e) {
          console.error("[keyword-intelligence/templates/$id PATCH]", e);
          return errorJson("Failed to update template", 500);
        }
      },
      DELETE: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const { id } = params;
          const store = getKeywordIntelligenceStore();

          const existing = await store.getTemplate(id);
          if (!existing) {
            return errorJson("Template not found", 404);
          }

          await store.deleteTemplate(id);
          return json({ message: "Template deleted" });
        } catch (e) {
          console.error("[keyword-intelligence/templates/$id DELETE]", e);
          return errorJson("Failed to delete template", 500);
        }
      },
    },
  },
});

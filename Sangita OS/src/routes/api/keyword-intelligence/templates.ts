import { createFileRoute } from "@tanstack/react-router";
import { getKeywordIntelligenceStore } from "@/lib/keyword-intelligence/store";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/templates")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const url = new URL(request.url);
          const regionCode = url.searchParams.get("regionCode") || undefined;

          const store = getKeywordIntelligenceStore();
          const templates = await store.listTemplates(regionCode);
          return json({ templates, total: templates.length });
        } catch (e) {
          console.error("[keyword-intelligence/templates GET]", e);
          return errorJson("Failed to list templates", 500);
        }
      },
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") {
            return errorJson("Invalid request body", 400);
          }

          const required = ["name", "basePatterns"];
          for (const field of required) {
            if (!body[field]) {
              return errorJson(`Missing required field: ${field}`, 400);
            }
          }

          const store = getKeywordIntelligenceStore();

          const template = {
            id: crypto.randomUUID(),
            name: body.name,
            description: body.description ?? null,
            regionCode: body.regionCode ?? null,
            basePatterns: Array.isArray(body.basePatterns) ? body.basePatterns : [],
            categoryModifiers: Array.isArray(body.categoryModifiers) ? body.categoryModifiers : [],
            cityModifiers: Array.isArray(body.cityModifiers) ? body.cityModifiers : [],
            languageModifiers: Array.isArray(body.languageModifiers) ? body.languageModifiers : [],
            suffixes: Array.isArray(body.suffixes) ? body.suffixes : [],
            maxCombinationsPerRun: Number(body.maxCombinationsPerRun) || 50,
            priority: Number(body.priority) || 5,
            sourceTag: body.sourceTag || "generated",
            isActive: body.isActive !== false,
          };

          const saved = await store.upsertTemplate(template);
          return json({ template: saved }, { status: 201 });
        } catch (e) {
          console.error("[keyword-intelligence/templates POST]", e);
          return errorJson("Failed to create template", 500);
        }
      },
    },
  },
});

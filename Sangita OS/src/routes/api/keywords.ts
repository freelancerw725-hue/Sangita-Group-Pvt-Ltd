import { createFileRoute } from "@tanstack/react-router";
import { getKeywordStore } from "@/lib/keywords/store";
import {
  buildKeyword,
  DuplicateKeywordError,
  KeywordValidationError,
  validateCreateInput,
} from "@/lib/keywords/service";
import { normalizeKeyword } from "@/lib/keywords/normalize";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keywords")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const store = getKeywordStore();
          const keywords = await store.list();
          // Enrich with today counts for daily target UI
          const todayCounts = await store.getTodayCounts(new Date());
          const data = keywords.map((k) => {
            const today = todayCounts.get(k.id) ?? 0;
            return {
              ...k,
              todaySearches: today,
              remaining: Math.max(0, k.dailyTarget - today),
              reachedToday: today >= k.dailyTarget,
            };
          });
          return json({ keywords: data, total: data.length });
        } catch (e) {
          console.error("[keywords GET]", e);
          return errorJson("Failed to list keywords", 500);
        }
      },
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body.keyword !== "string") {
            return errorJson("keyword is required");
          }
          const input = {
            keyword: body.keyword,
            source: body.source ?? "manual",
            dailyTarget: body.dailyTarget,
            priority: body.priority,
            notes: body.notes ?? null,
            status: body.status,
          };

          // Validate before normalize check
          try {
            validateCreateInput(input as never);
          } catch (err) {
            if (err instanceof KeywordValidationError) return errorJson(err.message, 400);
            throw err;
          }

          const normalized = normalizeKeyword(input.keyword);
          const store = getKeywordStore();
          const existing = await store.findByNormalized(normalized);
          if (existing) {
            return errorJson(`Duplicate keyword: "${input.keyword.trim()}" already exists as "${existing.keyword}"`, 409, {
              code: "DUPLICATE_KEYWORD",
              existing,
            });
          }

          const nowIso = new Date().toISOString();
          const id = crypto.randomUUID();
          const keyword = buildKeyword(input as never, { id, nowIso });
          const saved = await store.insert(keyword);
          return json({ keyword: saved }, { status: 201 });
        } catch (e) {
          if (e instanceof DuplicateKeywordError) return errorJson(e.message, 409);
          if (e instanceof KeywordValidationError) return errorJson(e.message, 400);
          console.error("[keywords POST]", e);
          return errorJson("Failed to create keyword", 500);
        }
      },
    },
  },
});

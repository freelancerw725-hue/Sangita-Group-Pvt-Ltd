import { createFileRoute } from "@tanstack/react-router";
import { getKeywordStore } from "@/lib/keywords/store";
import { buildKeyword, filterNewKeywords } from "@/lib/keywords/service";
import { normalizeKeyword } from "@/lib/keywords/normalize";
import { createAiKeywordProvider } from "@/lib/keywords/ai-provider";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keywords/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const body = await request.json().catch(() => ({}));
          const count = Math.min(Math.max(Number(body.count ?? 5), 1), 50);
          const seed = typeof body.seed === "string" ? body.seed : undefined;
          const context = typeof body.context === "string" ? body.context : undefined;
          const keywordsInput = Array.isArray(body.keywords) ? (body.keywords as string[]) : null;
          // Two modes: generate via provider, or accept explicit keywords with source ai
          let candidates: string[];
          if (keywordsInput) {
            candidates = keywordsInput.filter((k) => typeof k === "string");
          } else {
            const provider = createAiKeywordProvider();
            candidates = await provider.generateKeywords({ count, seed, context });
          }

          if (candidates.length === 0) return errorJson("No keywords to add");

          const store = getKeywordStore();
          const existing = await store.list();
          const dailyTarget = body.dailyTarget;
          const priority = body.priority;

          const { toInsert, duplicates } = filterNewKeywords(candidates, existing, "ai");

          const inserted: unknown[] = [];
          for (const item of toInsert) {
            const normalized = normalizeKeyword(item.keyword);
            // double-check after filter
            const dup = await store.findByNormalized(normalized);
            if (dup) {
              duplicates.push(item.keyword);
              continue;
            }
            const kw = buildKeyword(
              {
                keyword: item.keyword,
                source: "ai",
                dailyTarget: dailyTarget ?? 100,
                priority: priority ?? 5,
                notes: body.notes ?? null,
              },
              { id: crypto.randomUUID(), nowIso: new Date().toISOString() },
            );
            const saved = await store.insert(kw);
            inserted.push(saved);
          }

          return json(
            {
              inserted,
              duplicates,
              totalRequested: candidates.length,
              insertedCount: inserted.length,
              duplicateCount: duplicates.length,
            },
            { status: 201 },
          );
        } catch (e) {
          console.error("[keywords/ai POST]", e);
          return errorJson(e instanceof Error ? e.message : "Failed to generate AI keywords", 500);
        }
      },
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        // Preview generation without persisting
        try {
          const url = new URL(request.url);
          const count = Math.min(Math.max(Number(url.searchParams.get("count") ?? 5), 1), 20);
          const seed = url.searchParams.get("seed") ?? undefined;
          const context = url.searchParams.get("context") ?? undefined;
          const provider = createAiKeywordProvider();
          const keywords = await provider.generateKeywords({ count, seed, context });
          return json({ keywords, count: keywords.length, preview: true });
        } catch (e) {
          console.error("[keywords/ai GET]", e);
          return errorJson("Failed to preview AI keywords", 500);
        }
      },
    },
  },
});

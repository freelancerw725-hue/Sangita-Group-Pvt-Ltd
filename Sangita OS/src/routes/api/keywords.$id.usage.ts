import { createFileRoute } from "@tanstack/react-router";
import { getKeywordStore } from "@/lib/keywords/store";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keywords/$id/usage")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        const id = (params as { id: string }).id;
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body.eventType !== "string") {
            return errorJson("eventType required: search_started | search_completed | failed_search");
          }
          const eventType = body.eventType as string;
          if (!["search_started", "search_completed", "failed_search"].includes(eventType)) {
            return errorJson("eventType must be search_started|search_completed|failed_search");
          }
          const leadsFound = Number(body.leadsFound ?? 0);
          const newLeads = Number(body.newLeads ?? 0);
          const duplicates = Number(body.duplicates ?? 0);
          const errorMessage = body.errorMessage ?? null;

          if (
            !Number.isInteger(leadsFound) ||
            leadsFound < 0 ||
            !Number.isInteger(newLeads) ||
            newLeads < 0 ||
            !Number.isInteger(duplicates) ||
            duplicates < 0
          ) {
            return errorJson("leadsFound/newLeads/duplicates must be integers >=0");
          }

          const store = getKeywordStore();
          const kw = await store.getById(id);
          if (!kw) return errorJson("Keyword not found", 404);

          const nowIso = new Date().toISOString();
          const usage = {
            id: crypto.randomUUID(),
            keywordId: id,
            keyword: kw.keyword,
            eventType: eventType as "search_started" | "search_completed" | "failed_search",
            leadsFound,
            newLeads,
            duplicates,
            errorMessage,
            createdAt: nowIso,
          };

          await store.insertUsage(usage as never);

          // Update counters on keyword
          const patch: Record<string, unknown> = { lastUsedAt: nowIso };
          if (eventType === "search_started") {
            patch.totalSearches = kw.totalSearches + 1;
          } else if (eventType === "search_completed") {
            // If caller only sends completed, count it as a search as well when no recent started
            // For simplicity, always increment search + leads on completed, but avoid double-count if both events are sent.
            // We increment totalSearches here only — callers sending both started+completed will double-count if we do.
            // So: only increment if the completed payload includes `countAsSearch: true` or if no started was sent recently.
            // Phase 1 heuristic: if body.countAsSearch === true or if caller sent completed without prior started,
            // we increment. To keep it simple, check body.incrementSearch flag, default false for backward compat
            // but we also support auto-count when newLeads etc provided.
            // Decision: increment if body.incrementSearch !== false and event is search_completed and caller expects it.
            // For tests, we increment when newLeads etc are provided? Let's make explicit:
            const incrementSearch = body.incrementSearch ?? true; // default true for completed to match daily target expectation
            // But if they already sent search_started before, they'd send incrementSearch: false
            if (incrementSearch) patch.totalSearches = kw.totalSearches + 1;
            patch.totalLeadsFound = kw.totalLeadsFound + leadsFound;
            patch.totalNewLeads = kw.totalNewLeads + newLeads;
            patch.totalDuplicates = kw.totalDuplicates + duplicates;
          } else if (eventType === "failed_search") {
            // only lastUsedAt
          }

          const updated = await store.update(id, patch as never);
          return json({ usage, keyword: updated }, { status: 201 });
        } catch (e) {
          console.error("[keywords $id/usage POST]", e);
          return errorJson("Failed to record usage", 500);
        }
      },
      GET: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        const id = (params as { id: string }).id;
        try {
          const store = getKeywordStore();
          const kw = await store.getById(id);
          if (!kw) return errorJson("Keyword not found", 404);
          const url = new URL(request.url);
          const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
          const usages = await store.listUsage(id, limit);
          const today = await store.countTodaySearches(id, new Date());
          return json({
            keyword: kw,
            usages,
            todaySearches: today,
            remaining: Math.max(0, kw.dailyTarget - today),
            reachedToday: today >= kw.dailyTarget,
          });
        } catch (e) {
          console.error("[keywords $id/usage GET]", e);
          return errorJson("Failed to list usage", 500);
        }
      },
    },
  },
});

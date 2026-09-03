import { createFileRoute } from "@tanstack/react-router";
import { getKeywordStore } from "@/lib/dashboard/server";
import { KeywordValidationError, validateUpdateInput } from "@/lib/keywords/service";
import { normalizeKeyword } from "@/lib/keywords/normalize";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keywords/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        const id = (params as { id: string }).id;
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") return errorJson("Invalid JSON body");
          const patch: Record<string, unknown> = {};
          if (body.keyword !== undefined) patch.keyword = body.keyword;
          if (body.dailyTarget !== undefined) patch.dailyTarget = body.dailyTarget;
          if (body.priority !== undefined) patch.priority = body.priority;
          if (body.notes !== undefined) patch.notes = body.notes;
          if (body.status !== undefined) patch.status = body.status;

          if (Object.keys(patch).length === 0) return errorJson("No fields to update");

          try {
            validateUpdateInput(patch as never);
          } catch (err) {
            if (err instanceof KeywordValidationError) return errorJson(err.message, 400);
            throw err;
          }

          const store = getKeywordStore();
          const existing = await store.getById(id);
          if (!existing) return errorJson("Keyword not found", 404);

          // duplicate check if keyword is being changed
          if (typeof patch.keyword === "string") {
            const normalized = normalizeKeyword(patch.keyword as string);
            const dup = await store.findByNormalized(normalized);
            if (dup && dup.id !== id) {
              return errorJson(
                `Duplicate keyword: "${patch.keyword}" already exists as "${dup.keyword}"`,
                409,
                {
                  code: "DUPLICATE_KEYWORD",
                  existing: dup,
                },
              );
            }
            // patch normalized too
            (patch as Record<string, unknown>).normalizedKeyword = normalized;
            // clean keyword whitespace
            patch.keyword = (patch.keyword as string).trim().replace(/\s+/g, " ");
          }

          // Map camelCase patch to store shape
          const storePatch: Record<string, unknown> = {};
          if (patch.keyword !== undefined) storePatch.keyword = patch.keyword;
          if (patch.dailyTarget !== undefined) storePatch.dailyTarget = patch.dailyTarget;
          if (patch.priority !== undefined) storePatch.priority = patch.priority;
          if (patch.notes !== undefined) storePatch.notes = patch.notes;
          if (patch.status !== undefined) storePatch.status = patch.status;
          if ((patch as Record<string, unknown>).normalizedKeyword !== undefined) {
            storePatch.normalizedKeyword = (patch as Record<string, unknown>).normalizedKeyword;
          }

          const updated = await store.update(id, storePatch as never);
          return json({ keyword: updated });
        } catch (e) {
          if (e instanceof KeywordValidationError) return errorJson(e.message, 400);
          console.error("[keywords $id PATCH]", e);
          return errorJson("Failed to update keyword", 500);
        }
      },
      DELETE: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        const id = (params as { id: string }).id;
        try {
          const store = getKeywordStore();
          const existing = await store.getById(id);
          if (!existing) return errorJson("Keyword not found", 404);
          await store.delete(id);
          return json({ success: true, deletedId: id });
        } catch (e) {
          console.error("[keywords $id DELETE]", e);
          return errorJson("Failed to delete keyword", 500);
        }
      },
      // POST for activate/pause toggle convenience: { action: "activate"|"pause"|"complete" }
      POST: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        const id = (params as { id: string }).id;
        try {
          const body = await request.json().catch(() => ({}));
          const action = (body as { action?: string })?.action;
          const statusMap: Record<string, string> = {
            activate: "active",
            pause: "paused",
            complete: "completed",
            completed: "completed",
            active: "active",
            paused: "paused",
          };
          let nextStatus: string | undefined = statusMap[action ?? ""];
          // Also support ?action= via query
          if (!nextStatus) {
            try {
              const url = new URL(request.url);
              const q = url.searchParams.get("action");
              if (q) nextStatus = statusMap[q];
            } catch {}
          }
          if (!nextStatus) return errorJson("Invalid action. Use activate|pause|complete", 400);
          const store = getKeywordStore();
          const existing = await store.getById(id);
          if (!existing) return errorJson("Keyword not found", 404);
          const updated = await store.update(id, { status: nextStatus } as never);
          return json({ keyword: updated });
        } catch (e) {
          console.error("[keywords $id POST toggle]", e);
          return errorJson("Failed to toggle keyword", 500);
        }
      },
      GET: async ({ request, params }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        const id = (params as { id: string }).id;
        try {
          const store = getKeywordStore();
          const kw = await store.getById(id);
          if (!kw) return errorJson("Keyword not found", 404);
          const today = await store.countTodaySearches(id, new Date());
          return json({
            keyword: kw,
            todaySearches: today,
            remaining: Math.max(0, kw.dailyTarget - today),
            reachedToday: today >= kw.dailyTarget,
          });
        } catch (e) {
          console.error("[keywords $id GET]", e);
          return errorJson("Failed to fetch keyword", 500);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { getKeywordIntelligenceStore } from "@/lib/keyword-intelligence/store";
import {
  validateIntelligenceConfig,
  IntelligenceValidationError,
} from "@/lib/keyword-intelligence/service";
import { isAuthorized, unauthorizedResponse, json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/keyword-intelligence/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const store = getKeywordIntelligenceStore();
          const config = await store.getConfig();
          return json({ config });
        } catch (e) {
          console.error("[keyword-intelligence/config GET]", e);
          return errorJson("Failed to get config", 500);
        }
      },
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return unauthorizedResponse();
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") {
            return errorJson("Invalid request body", 400);
          }

          // Validate config
          let validatedConfig;
          try {
            validatedConfig = validateIntelligenceConfig(body);
          } catch (err) {
            if (err instanceof IntelligenceValidationError) {
              return errorJson(err.message, 400, { code: "VALIDATION_ERROR" });
            }
            throw err;
          }

          const store = getKeywordIntelligenceStore();
          const configs = Object.entries(validatedConfig).map(([key, value]) => ({ key, value }));
          await store.bulkSetConfig(configs);

          return json({ config: validatedConfig, message: "Configuration updated" });
        } catch (e) {
          console.error("[keyword-intelligence/config POST]", e);
          return errorJson("Failed to update config", 500);
        }
      },
    },
  },
});

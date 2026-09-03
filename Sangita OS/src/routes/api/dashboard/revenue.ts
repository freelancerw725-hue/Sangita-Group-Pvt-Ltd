import { createFileRoute } from "@tanstack/react-router";
import {
  getRevenueMetrics,
  getRevenueTrend,
  getPipelineStages,
  getCashFlow,
  getExpenseBreakdown,
  getPnL,
} from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/dashboard/revenue")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [metrics, trend, pipeline, cashFlow, expenses, pnl] = await Promise.all([
            getRevenueMetrics(),
            getRevenueTrend(),
            getPipelineStages(),
            getCashFlow(),
            getExpenseBreakdown(),
            getPnL(),
          ]);
          return json({ metrics, trend, pipeline, cashFlow, expenses, pnl });
        } catch (e) {
          console.error("[dashboard/revenue] Error:", e);
          return errorJson("Failed to fetch revenue metrics", 500);
        }
      },
    },
  },
});

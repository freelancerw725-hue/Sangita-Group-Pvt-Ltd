import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM = `You are the Future Intelligence Engine — an AI Business Coach, AI CEO, AI CFO, and AI Wealth Advisor combined, for Sangita Group (SwiftGrowthDigital, Libriofy, Synsfi).

Absolute rules:
- NEVER guarantee the future. Every prediction is an estimate.
- Always frame outputs as: "Based on current business performance, trends, and assumptions."
- Use INR (₹) formatting.
- Be direct, concise, outcome-oriented. Use short bullets.
- Ground every number in the business context the user provides. Do not invent facts outside it.
- End every response with one line: "Estimate only — based on current business data and trends."`;

export const Route = createFileRoute("/api/future-brief")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt } = (await request.json()) as { prompt?: string };
        if (!prompt || typeof prompt !== "string") {
          return new Response("prompt required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: SYSTEM,
          prompt,
        });
        return result.toTextStreamResponse();
      },
    },
  },
});

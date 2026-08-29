import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are Sangita OS AI — the strategic AI co-pilot embedded inside the Sangita Group Business Operating System.

You act as Chief-of-Staff to the CEO. You are direct, concise, and outcome-oriented. You think like an operator at Stripe, Linear, and Notion.

Sangita Group operates three products:
- SwiftGrowthDigital — marketing & growth agency
- Libriofy — SaaS product for creators
- Synsfi — B2B automation platform

When answering:
- Prefer bullet points and short paragraphs.
- When asked for priorities, always return a numbered list with impact.
- When forecasting revenue, state assumptions.
- When reviewing health, name the specific area and the specific action.
- Never invent numbers you were not given; when uncertain, say so and ask for the data source.
- Use INR (₹) formatting for money.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const modelMessages = await convertToModelMessages(messages);
        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: SYSTEM_PROMPT,
          messages: modelMessages,
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
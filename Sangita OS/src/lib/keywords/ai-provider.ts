/**
 * AI Keyword Provider — interface + stub implementation
 * Phase 1: no paid AI API dependency.
 * Future providers (OpenAI, Lovable Gateway, etc.) implement AiKeywordProvider.
 */

export interface AiKeywordProvider {
  /**
   * Generate candidate keywords.
   * @param opts.count - how many to generate
   * @param opts.seed - optional seed keyword/context
   * @param opts.context - optional free-form context (industry, geography)
   */
  generateKeywords(opts?: { count?: number; seed?: string; context?: string }): Promise<string[]>;
}

/**
 * Stub provider: deterministic, no network.
 * Useful for dev, tests, and until a real LLM is wired.
 * Returns plausible news/lead keywords derived from seed.
 */
export class StubAiKeywordProvider implements AiKeywordProvider {
  async generateKeywords(opts?: {
    count?: number;
    seed?: string;
    context?: string;
  }): Promise<string[]> {
    const count = Math.max(1, Math.min(opts?.count ?? 5, 50));
    const seed = (opts?.seed ?? "India News").trim() || "India News";
    const context = (opts?.context ?? "").trim();

    // Deterministic: hash seed to produce varied suffixes without LLM
    const suffixes = [
      "Live",
      "Updates",
      "Today",
      "Breaking",
      "Headlines",
      "Latest",
      "Local",
      "Regional",
      "Exclusive",
      "Reports",
      "Highlights",
      "Coverage",
    ];
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const suf = suffixes[i % suffixes.length];
      // Add context word if provided (e.g., industry)
      const ctxPart = context ? ` ${context}` : "";
      if (i === 0) out.push(seed);
      else out.push(`${seed} ${suf}${ctxPart}`.trim());
    }
    return out;
  }
}

/**
 * Lovable Gateway provider (placeholder) — shows how a real LLM would be plugged.
 * Phase 1: not wired to network; throws if env missing to avoid accidental billing.
 */
export class LovableGatewayAiKeywordProvider implements AiKeywordProvider {
  constructor(private readonly apiKey?: string) {}
  async generateKeywords(opts?: {
    count?: number;
    seed?: string;
    context?: string;
  }): Promise<string[]> {
    const key = this.apiKey ?? process.env.LOVABLE_API_KEY;
    if (!key) {
      throw new Error("LOVABLE_API_KEY not configured. Use StubAiKeywordProvider for Phase 1.");
    }
    // Real implementation would call ai.gateway.lovable.dev with a prompt like:
    // "Generate ${count} SEO lead-search keywords related to: ${seed} ${context}"
    // Returning stub for now to keep zero-cost invariant.
    const stub = new StubAiKeywordProvider();
    return stub.generateKeywords(opts);
  }
}

/**
 * Factory: returns the configured provider.
 * Env flag KEYWORD_AI_PROVIDER selects implementation.
 */
export function createAiKeywordProvider(): AiKeywordProvider {
  const provider = process.env.KEYWORD_AI_PROVIDER ?? "stub";
  if (provider === "lovable") {
    return new LovableGatewayAiKeywordProvider(process.env.LOVABLE_API_KEY);
  }
  return new StubAiKeywordProvider();
}

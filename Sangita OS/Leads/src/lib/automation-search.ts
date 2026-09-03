/**
 * Reusable search logic for both manual (/api/search) and automation (/api/automation/lead-search).
 * Wraps existing YouTube discovery, transforms, filters, saves to same lead-store,
 * history and dedupe rules.
 *
 * No duplicate search engine, no duplicate DB.
 */
import { normalizeKeywords } from "@/lib/lead-utils";
import { discoverYoutubeChannels, transformCandidateToLead, applyLeadFilters } from "@/lib/youtube";
import {
  saveNewLeads,
  appendSearchHistory,
  getStoredLeads,
  getSearchHistory,
} from "@/lib/lead-store";
import { buildStats } from "@/lib/lead-utils";
import type { SearchResponse } from "@/lib/types";

export interface AutomationSearchInput {
  keyword?: string; // single keyword from Sangita OS — will be wrapped as [keyword]
  keywords?: string[]; // alternative plural
  filters?: {
    minSubscribers?: number;
    maxSubscribers?: number;
    country?: string;
    keywordFilter?: string;
    channelAge?: "any" | "under1" | "oneToThree" | "threeToFive" | "overFive";
    sortBy?: "subscribers" | "views" | "videos";
  };
}

// Allow direct injection for tests (mock YouTube)
export type DiscoverFn = typeof discoverYoutubeChannels;

export async function executeLeadSearch(
  input: AutomationSearchInput,
  opts?: { discover?: DiscoverFn },
): Promise<{
  leadsFound: number;
  newLeads: number;
  duplicates: number;
  totalFound: number;
  savedCount: number;
  skippedDuplicates: number;
  storedLeadsCount: number;
  response: SearchResponse;
}> {
  const rawKeywords = input.keywords ?? (input.keyword ? [input.keyword] : []);
  // Reuse normalizeKeywords (single source of truth, same as manual)
  const keywords = normalizeKeywords(rawKeywords.length ? rawKeywords : (input.keyword ?? ""));
  if (keywords.length === 0) throw new Error("At least one keyword is required.");

  // Validate single-keyword automation is primary; but allow multiple if passed
  const filters = {
    keywords,
    minSubscribers: input.filters?.minSubscribers,
    maxSubscribers: input.filters?.maxSubscribers,
    country: input.filters?.country,
    keywordFilter: input.filters?.keywordFilter,
    channelAge: input.filters?.channelAge ?? "any",
    sortBy: input.filters?.sortBy ?? "subscribers",
  } as const;

  const discover = opts?.discover ?? discoverYoutubeChannels;
  const discovered = await discover(keywords);
  const leadCandidates = discovered.map(({ candidate, matchedKeywords }) =>
    transformCandidateToLead(candidate, matchedKeywords.join(" | ") || keywords.join(" | ")),
  );
  const filtered = applyLeadFilters(leadCandidates, filters as never);
  const { leads, skippedDuplicates } = await saveNewLeads(filtered);
  const savedCount = Math.max(0, filtered.length - skippedDuplicates);

  const historyEntry = {
    id: crypto.randomUUID(),
    searchKeyword: keywords.join(" | "),
    keywords,
    searchedAt: new Date().toISOString(),
    totalLeadsFound: filtered.length,
  };
  await appendSearchHistory(historyEntry);
  const history = await getSearchHistory();
  const stored = await getStoredLeads();
  const stats = buildStats(stored);

  const payload: SearchResponse = {
    leads: stored,
    currentSearchLeads: filtered,
    totalFound: filtered.length,
    savedCount,
    skippedDuplicates,
    stats,
    historyEntry,
    history,
    message: `Found ${filtered.length} leads. Saved ${savedCount} new leads. Skipped ${skippedDuplicates} duplicates.`,
  };

  return {
    leadsFound: filtered.length,
    newLeads: savedCount,
    duplicates: skippedDuplicates,
    totalFound: filtered.length,
    savedCount,
    skippedDuplicates,
    storedLeadsCount: stored.length,
    response: payload,
  };
}

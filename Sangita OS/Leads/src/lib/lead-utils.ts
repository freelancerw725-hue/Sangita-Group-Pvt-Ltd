import { LeadFilters, LeadRecord, LeadScore, SearchHistoryEntry, SortBy, YouTubeChannelCandidate } from "@/lib/types";

const statusPriority: Record<LeadScore, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export function normalizeKeywords(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : input.split(/[\n,;,]+/g);
  return [...new Set(raw.map((value) => value.trim()).filter(Boolean))];
}

export function parsePositiveNumber(value: string | string[] | undefined): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

export function getAgeInYears(publishedAt: string): number {
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 0;
  const diffMs = Date.now() - published;
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

export function passesAgeFilter(ageInYears: number, channelAge?: LeadFilters["channelAge"]): boolean {
  if (!channelAge || channelAge === "any") return true;
  switch (channelAge) {
    case "under1":
      return ageInYears < 1;
    case "oneToThree":
      return ageInYears >= 1 && ageInYears < 3;
    case "threeToFive":
      return ageInYears >= 3 && ageInYears < 5;
    case "overFive":
      return ageInYears >= 5;
    default:
      return true;
  }
}

export function scoreLead(subscribers: number): LeadScore {
  if (subscribers >= 100_000) return "High";
  if (subscribers >= 20_000) return "Medium";
  return "Low";
}

export function calculateLeadScore(subscribers: number, websiteAvailable: boolean, emailAvailable: boolean, ageInYears: number) {
  let score = 0;
  score += Math.min(50, Math.floor(subscribers / 2000));
  score += websiteAvailable ? 20 : 0;
  score += emailAvailable ? 20 : 0;
  score += Math.min(10, Math.floor(ageInYears));
  return Math.min(100, Math.max(0, score));
}

export function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

export function extractContactFields(description: string): {
  website: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  telegram: string;
  appAvailable: boolean;
  websiteAvailable: boolean;
} {
  const text = description || "";
  const urls = [...text.matchAll(/https?:\/\/[^\s)]+/gi)].map((match) => match[0]);
  const website = urls.find((url) => !/youtube\.com|youtu\.be|instagram\.com|facebook\.com|t\.me|telegram\.me|play\.google\.com|apps\.apple\.com/i.test(url)) ?? "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?){2,4}\d{3,4}/)?.[0] ?? "";
  const instagram = urls.find((url) => /instagram\.com/i.test(url)) ?? "";
  const facebook = urls.find((url) => /facebook\.com/i.test(url)) ?? "";
  const telegram = urls.find((url) => /t\.me|telegram\.me/i.test(url)) ?? "";
  const appAvailable = /play\.google\.com|apps\.apple\.com|app store|google play/i.test(text);
  const websiteAvailable = Boolean(website);

  return { website, email, phone, instagram, facebook, telegram, appAvailable, websiteAvailable };
}

export function includesKeywordMatch(channel: YouTubeChannelCandidate | LeadRecord, keywordFilter?: string): boolean {
  if (!keywordFilter) return true;
  const needle = normalizeText(keywordFilter);
  const haystack = normalizeText([
    channel.channelName,
    channel.description,
    "website" in channel ? channel.website : "",
    "searchKeyword" in channel ? channel.searchKeyword : "",
  ].join(" "));
  return haystack.includes(needle);
}

export function filterCandidates<T extends { subscribers: number; country: string; description: string; ageInYears: number; channelName: string }>(
  items: T[],
  filters: LeadFilters,
): T[] {
  return items.filter((item) => {
    if (filters.minSubscribers !== undefined && item.subscribers < filters.minSubscribers) return false;
    if (filters.maxSubscribers !== undefined && item.subscribers > filters.maxSubscribers) return false;
    if (filters.country && filters.country.trim() && !normalizeText(item.country).includes(normalizeText(filters.country))) return false;
    if (filters.keywordFilter && !normalizeText([item.channelName, item.description].join(" ")).includes(normalizeText(filters.keywordFilter))) return false;
    if (!passesAgeFilter(item.ageInYears, filters.channelAge)) return false;
    return true;
  });
}

export function sortCandidates<T extends { subscribers: number; viewCount: number; videoCount: number }>(items: T[], sortBy: SortBy = "subscribers"): T[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "views":
        return b.viewCount - a.viewCount;
      case "videos":
        return b.videoCount - a.videoCount;
      case "subscribers":
      default:
        return b.subscribers - a.subscribers;
    }
  });
  return sorted;
}

export function buildStats(leads: LeadRecord[]) {
  return {
    totalLeads: leads.length,
    newLeads: leads.filter((lead) => lead.leadStatus === "New").length,
    contacted: leads.filter((lead) => lead.leadStatus === "Contacted").length,
    replied: leads.filter((lead) => lead.leadStatus === "Replied").length,
    highPotential: leads.filter((lead) => statusPriority[lead.leadScore] === 3).length,
  };
}

export function mergeAndDedupeLeads(existing: LeadRecord[], incoming: LeadRecord[]): { merged: LeadRecord[]; skippedDuplicates: number } {
  const seen = new Set(existing.map((lead) => lead.channelId));
  const merged = [...existing];
  let skippedDuplicates = 0;
  for (const lead of incoming) {
    if (seen.has(lead.channelId)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(lead.channelId);
    merged.push(lead);
  }
  return { merged, skippedDuplicates };
}

export function dedupeHistory(entries: SearchHistoryEntry[]): SearchHistoryEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.searchKeyword}|${entry.searchedAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

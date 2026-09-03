import { getAgeInYears, extractContactFields, scoreLead } from "@/lib/lead-utils";
import { LeadFilters, LeadRecord, YouTubeChannelCandidate } from "@/lib/types";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";

import { requireEnvValue } from "@/lib/env";

function requireYouTubeKey() {
  const apiKey = requireEnvValue(
    "YOUTUBE_API_KEY",
    "YouTube API is not configured. Set YOUTUBE_API_KEY.",
  ).trim();
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is missing.");
  }
  return apiKey;
}

function maskYouTubeUrlKey(url: string): string {
  return url.replace(/(key=)([^&]+)/, (_, prefix, key) => {
    if (!key) return `${prefix}****`;
    return `${prefix}${key.slice(0, 4)}${"*".repeat(Math.max(0, key.length - 4))}`;
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  console.log("[youtube] Request URL:", maskYouTubeUrlKey(url));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `YouTube API request failed (${response.status}): ${body || response.statusText}`,
    );
  }
  return response.json() as Promise<T>;
}

interface YoutubeSearchResponse {
  items?: Array<{
    id?: { channelId?: string };
  }>;
}

interface YoutubeChannelsResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      publishedAt?: string;
      country?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
    statistics?: {
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
    };
    brandingSettings?: {
      channel?: {
        country?: string;
        customUrl?: string;
      };
    };
  }>;
}

export interface DiscoveredYoutubeChannel {
  candidate: YouTubeChannelCandidate;
  matchedKeywords: string[];
}

export async function discoverYoutubeChannels(
  keywords: string[],
): Promise<DiscoveredYoutubeChannel[]> {
  const apiKey = requireYouTubeKey();
  const matchedKeywordsByChannel = new Map<string, Set<string>>();

  for (const keyword of keywords) {
    const url = new URL(YOUTUBE_SEARCH_URL);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "channel");
    url.searchParams.set("maxResults", "25");
    url.searchParams.set("q", keyword);
    url.searchParams.set("safeSearch", "none");
    url.searchParams.set("order", "relevance");
    url.searchParams.set("key", apiKey);

    const search = await fetchJson<YoutubeSearchResponse>(url.toString());
    for (const item of search.items ?? []) {
      const channelId = item.id?.channelId;
      if (!channelId) continue;
      const existing = matchedKeywordsByChannel.get(channelId) ?? new Set<string>();
      existing.add(keyword);
      matchedKeywordsByChannel.set(channelId, existing);
    }
  }

  const channelIds = [...matchedKeywordsByChannel.keys()];
  if (channelIds.length === 0) return [];

  const candidates: DiscoveredYoutubeChannel[] = [];
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50).join(",");
    const url = new URL(YOUTUBE_CHANNELS_URL);
    url.searchParams.set("part", "snippet,statistics,brandingSettings");
    url.searchParams.set("id", batch);
    url.searchParams.set("key", apiKey);

    const channels = await fetchJson<YoutubeChannelsResponse>(url.toString());
    for (const item of channels.items ?? []) {
      const id = item.id;
      const snippet = item.snippet;
      const statistics = item.statistics;
      if (!id || !snippet) continue;
      const thumbnail =
        snippet.thumbnails?.high?.url ??
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.default?.url ??
        "";
      const description = snippet.description ?? "";
      const country = snippet.country ?? item.brandingSettings?.channel?.country ?? "";
      const customUrl = snippet.customUrl ?? item.brandingSettings?.channel?.customUrl ?? "";
      const candidate: YouTubeChannelCandidate = {
        channelId: id,
        channelName: snippet.title ?? "",
        channelUrl: `https://www.youtube.com/channel/${id}`,
        subscribers: Number(statistics?.subscriberCount ?? 0),
        videoCount: Number(statistics?.videoCount ?? 0),
        viewCount: Number(statistics?.viewCount ?? 0),
        description,
        country,
        customUrl,
        thumbnail,
        publishedAt: snippet.publishedAt ?? "",
      };
      candidates.push({
        candidate,
        matchedKeywords: [...(matchedKeywordsByChannel.get(id) ?? new Set<string>())],
      });
    }
  }

  return candidates;
}

export function transformCandidateToLead(
  candidate: YouTubeChannelCandidate,
  searchKeyword: string,
): LeadRecord {
  const contactFields = extractContactFields(candidate.description);
  const ageInYears = getAgeInYears(candidate.publishedAt);
  return {
    id: crypto.randomUUID(),
    source: "youtube",
    searchKeyword,
    leadScore: scoreLead(candidate.subscribers),
    channelId: candidate.channelId,
    channelName: candidate.channelName,
    channelUrl: candidate.channelUrl,
    subscribers: candidate.subscribers,
    videoCount: candidate.videoCount,
    viewCount: candidate.viewCount,
    description: candidate.description,
    country: candidate.country,
    customUrl: candidate.customUrl,
    thumbnail: candidate.thumbnail,
    publishedAt: candidate.publishedAt,
    ageInYears,
    website: contactFields.website,
    email: contactFields.email,
    phone: contactFields.phone,
    instagram: contactFields.instagram,
    facebook: contactFields.facebook,
    telegram: contactFields.telegram,
    appAvailable: contactFields.appAvailable,
    websiteAvailable: contactFields.websiteAvailable,
    leadStatus: "New",
    leadStage: "New",
    approved: false,
    verified: false,
    sendMail: false,
    status: "New",
    replyStatus: "No Reply",
    sentTime: undefined,
    lastFollowupTime: "",
    followupCount: 0,
    threadId: "",
    campaignId: "",
    demoSent: false,
    demoSentTime: "",
    demoType: "",
    interested: false,
    meetingScheduled: false,
    closedWon: false,
    closedLost: false,
    lastReplyTime: "",
    lastEmailSubject: "",
    emailSentAt: undefined,
    emailThreadId: undefined,
    leadOwner: undefined,
    tags: [],
    crmNotes: "",
    notes: "",
    addedDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}

export function applyLeadFilters(leads: LeadRecord[], filters: LeadFilters): LeadRecord[] {
  const normalized = leads.filter((lead) => {
    if (filters.minSubscribers !== undefined && lead.subscribers < filters.minSubscribers)
      return false;
    if (filters.maxSubscribers !== undefined && lead.subscribers > filters.maxSubscribers)
      return false;
    if (
      filters.country &&
      !lead.country.trim().toLowerCase().includes(filters.country.trim().toLowerCase())
    )
      return false;
    if (filters.keywordFilter) {
      const needle = filters.keywordFilter.trim().toLowerCase();
      const haystack =
        `${lead.channelName} ${lead.description} ${lead.searchKeyword}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (filters.channelAge && filters.channelAge !== "any") {
      if (filters.channelAge === "under1" && !(lead.ageInYears < 1)) return false;
      if (filters.channelAge === "oneToThree" && !(lead.ageInYears >= 1 && lead.ageInYears < 3))
        return false;
      if (filters.channelAge === "threeToFive" && !(lead.ageInYears >= 3 && lead.ageInYears < 5))
        return false;
      if (filters.channelAge === "overFive" && !(lead.ageInYears >= 5)) return false;
    }
    return true;
  });

  const sortBy = filters.sortBy ?? "subscribers";
  normalized.sort((a, b) => {
    if (sortBy === "views") return b.viewCount - a.viewCount;
    if (sortBy === "videos") return b.videoCount - a.videoCount;
    return b.subscribers - a.subscribers;
  });

  return normalized;
}

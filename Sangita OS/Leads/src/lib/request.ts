import { ChannelAgePreset, LeadFilters, SortBy } from "@/lib/types";
import { normalizeKeywords, parsePositiveNumber } from "@/lib/lead-utils";

const sortValues: SortBy[] = ["subscribers", "views", "videos"];
const ageValues: ChannelAgePreset[] = ["any", "under1", "oneToThree", "threeToFive", "overFive"];

export function parseFiltersFromSearchParams(searchParams: URLSearchParams): LeadFilters {
  const sortByRaw = searchParams.get("sortBy") ?? "subscribers";
  const channelAgeRaw = searchParams.get("channelAge") ?? "any";
  return {
    keywords: normalizeKeywords(searchParams.get("keywords") ?? ""),
    minSubscribers: parsePositiveNumber(searchParams.get("minSubscribers") ?? undefined),
    maxSubscribers: parsePositiveNumber(searchParams.get("maxSubscribers") ?? undefined),
    country: searchParams.get("country") ?? undefined,
    keywordFilter: searchParams.get("keywordFilter") ?? undefined,
    channelAge: ageValues.includes(channelAgeRaw as ChannelAgePreset)
      ? (channelAgeRaw as ChannelAgePreset)
      : "any",
    sortBy: sortValues.includes(sortByRaw as SortBy) ? (sortByRaw as SortBy) : "subscribers",
  };
}

export function leadFiltersToQuery(filters: LeadFilters): string {
  const params = new URLSearchParams();
  if (filters.keywords.length > 0) params.set("keywords", filters.keywords.join("\n"));
  if (typeof filters.minSubscribers === "number")
    params.set("minSubscribers", String(filters.minSubscribers));
  if (typeof filters.maxSubscribers === "number")
    params.set("maxSubscribers", String(filters.maxSubscribers));
  if (filters.country) params.set("country", filters.country);
  if (filters.keywordFilter) params.set("keywordFilter", filters.keywordFilter);
  if (filters.channelAge) params.set("channelAge", filters.channelAge);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  return params.toString();
}

export type KeywordSource = "ai" | "manual";
export type KeywordStatus = "active" | "paused" | "completed";
export type UsageEventType = "search_started" | "search_completed" | "failed_search";

export interface Keyword {
  id: string;
  keyword: string;
  normalizedKeyword: string;
  source: KeywordSource;
  status: KeywordStatus;
  dailyTarget: number;
  priority: number; // 1 = highest, 10 = lowest
  createdAt: string; // ISO
  lastUsedAt: string | null; // ISO
  totalSearches: number;
  totalLeadsFound: number;
  totalNewLeads: number;
  totalDuplicates: number;
  notes: string | null;
}

export interface KeywordUsage {
  id: string;
  keywordId: string;
  keyword: string;
  eventType: UsageEventType;
  leadsFound: number;
  newLeads: number;
  duplicates: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface CreateKeywordInput {
  keyword: string;
  source: KeywordSource;
  dailyTarget?: number;
  priority?: number;
  notes?: string | null;
  status?: KeywordStatus;
}

export interface UpdateKeywordInput {
  keyword?: string;
  dailyTarget?: number;
  priority?: number;
  notes?: string | null;
  status?: KeywordStatus;
}

export interface NextKeywordResponse {
  keyword: string;
  source: KeywordSource;
  dailyTarget: number;
  priority: number;
  id: string;
  normalizedKeyword: string;
}

export interface DailyTargetInfo {
  keywordId: string;
  keyword: string;
  dailyTarget: number;
  todaySearches: number;
  remaining: number;
  reached: boolean;
}

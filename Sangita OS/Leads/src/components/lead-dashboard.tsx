"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  Search,
  Sheet,
  RefreshCw,
  Download,
  Save,
  ExternalLink,
  BadgeCheck,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  DashboardStats,
  LeadFilters,
  LeadRecord,
  SearchHistoryEntry,
  LeadStatus,
  LeadStage,
  SortBy,
  ChannelAgePreset,
  SearchResponse,
  EmailVerificationStatus,
  ApprovalStatus,
} from "@/lib/types";
import { leadFiltersToQuery } from "@/lib/request";

interface LeadDashboardProps {
  initialLeads: LeadRecord[];
  initialHistory: SearchHistoryEntry[];
  initialStats: DashboardStats;
}

const defaultFilters: LeadFilters = {
  keywords: [],
  minSubscribers: undefined,
  maxSubscribers: undefined,
  country: "",
  keywordFilter: "",
  channelAge: "any",
  sortBy: "subscribers",
};

const leadStatuses: LeadStatus[] = ["New", "Contacted", "Replied", "Interested", "Closed", "Not Interested"];
const sortOptions: { value: SortBy; label: string }[] = [
  { value: "subscribers", label: "Subscribers" },
  { value: "views", label: "Views" },
  { value: "videos", label: "Videos" },
];
const ageOptions: { value: ChannelAgePreset; label: string }[] = [
  { value: "any", label: "Any age" },
  { value: "under1", label: "Under 1 year" },
  { value: "oneToThree", label: "1-3 years" },
  { value: "threeToFive", label: "3-5 years" },
  { value: "overFive", label: "5+ years" },
];

const sourceOptions = [
  { value: "all", label: "All Categories" },
  { value: "youtube", label: "YouTube" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "manual", label: "Manual" },
];

const verificationOptions = [
  { value: "all", label: "All Verification" },
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
  { value: "risky", label: "Risky" },
  { value: "unknown", label: "Unknown" },
  { value: "not_verified", label: "Not Verified" },
];

const approvalOptions = [
  { value: "all", label: "All Approval" },
  { value: "approved", label: "Approved" },
  { value: "pending_review", label: "Pending Review" },
  { value: "rejected", label: "Rejected" },
];

const subscriberPresets = [
  { value: "any", label: "Any", min: undefined, max: undefined },
  { value: "micro", label: "Micro (<10K)", min: 0, max: 10000 },
  { value: "small", label: "Small (10K-100K)", min: 10000, max: 100000 },
  { value: "medium", label: "Medium (100K-1M)", min: 100000, max: 1000000 },
  { value: "large", label: "Large (>1M)", min: 1000000, max: undefined },
];

const STICKY_CHECKBOX_LEFT = 0;
const STICKY_INDEX_LEFT = 48;
const STICKY_NAME_LEFT = 112;
const STICKY_EMAIL_LEFT = 552;
const STICKY_VERIFICATION_LEFT = 812;

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAge(ageInYears: number) {
  if (ageInYears < 1) {
    const months = Math.max(1, Math.round(ageInYears * 12));
    return `${months} mo`;
  }
  return `${ageInYears.toFixed(ageInYears >= 10 ? 0 : 1)} yr`;
}

function badgeClasses(leadScore: LeadRecord["leadScore"]) {
  if (leadScore === "High") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (leadScore === "Medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function statusClasses(status: LeadStatus) {
  switch (status) {
    case "Contacted":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Replied":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "Interested":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Closed":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    case "Not Interested":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function verificationBadge(status: EmailVerificationStatus | undefined) {
  if (status === "valid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "invalid") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "risky") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "unknown") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
}

function approvalBadge(status: ApprovalStatus | undefined) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function isTruthy(value: string) {
  return value.trim().length > 0;
}

function getLatestSearchLeads(leads: LeadRecord[], history: SearchHistoryEntry[]) {
  const latestKeyword = history[0]?.searchKeyword?.trim();
  if (!latestKeyword) return [];
  return leads.filter((lead) => lead.searchKeyword.trim() === latestKeyword);
}

export default function LeadDashboard({ initialLeads, initialHistory, initialStats }: LeadDashboardProps) {
  const [leads, setLeads] = useState<LeadRecord[]>(initialLeads);
  const [currentSearchLeads, setCurrentSearchLeads] = useState<LeadRecord[]>(() => getLatestSearchLeads(initialLeads, initialHistory));
  const [history, setHistory] = useState<SearchHistoryEntry[]>(initialHistory);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [keywordsText, setKeywordsText] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
  const [tableMode, setTableMode] = useState<"current" | "all">("current");
  const [selectedChannelId, setSelectedChannelId] = useState<string>(getLatestSearchLeads(initialLeads, initialHistory)[0]?.channelId ?? "");
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [sendResultMessage, setSendResultMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState<"csv" | "xlsx" | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [addedDateFilter, setAddedDateFilter] = useState("");
  const [subscriberPreset, setSubscriberPreset] = useState("any");
  const [leadSheets, setLeadSheets] = useState<{ id: string; name: string; createdAt: string; totalLeads: number; approvedLeads: number; rejectedLeads: number; verificationSummary?: { valid: number; invalid: number }; templateName?: string; templateId?: number; sendAt?: string; status: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: number; name: string; category: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sheetName, setSheetName] = useState("");

  const activeLeads = tableMode === "all" ? leads : currentSearchLeads;
  const currentSearchCount = currentSearchLeads.length;
  const totalSavedCount = leads.length;

  const filteredLeads = useMemo(() => {
    const list = [...activeLeads].filter((lead) => {
      if (filters.minSubscribers !== undefined && lead.subscribers < filters.minSubscribers) return false;
      if (filters.maxSubscribers !== undefined && lead.subscribers > filters.maxSubscribers) return false;
      if (isTruthy(filters.country ?? "") && !lead.country.trim().toLowerCase().includes(filters.country?.trim().toLowerCase() ?? "")) return false;
      if (isTruthy(filters.keywordFilter ?? "")) {
        const haystack = `${lead.channelName} ${lead.description} ${lead.searchKeyword}`.toLowerCase();
        if (!haystack.includes(filters.keywordFilter!.trim().toLowerCase())) return false;
      }
      if (filters.channelAge && filters.channelAge !== "any") {
        if (filters.channelAge === "under1" && !(lead.ageInYears < 1)) return false;
        if (filters.channelAge === "oneToThree" && !(lead.ageInYears >= 1 && lead.ageInYears < 3)) return false;
        if (filters.channelAge === "threeToFive" && !(lead.ageInYears >= 3 && lead.ageInYears < 5)) return false;
        if (filters.channelAge === "overFive" && !(lead.ageInYears >= 5)) return false;
      }
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      if (verificationFilter !== "all" && lead.emailVerificationStatus !== verificationFilter) return false;
      if (approvalFilter !== "all" && lead.approvalStatus !== approvalFilter) return false;
      if (leadStatusFilter !== "all" && lead.leadStatus !== leadStatusFilter) return false;
      if (addedDateFilter && lead.addedDate !== addedDateFilter) return false;
      return true;
    });

    list.sort((a, b) => {
      if (filters.sortBy === "views") return b.viewCount - a.viewCount;
      if (filters.sortBy === "videos") return b.videoCount - a.videoCount;
      return b.subscribers - a.subscribers;
    });

    return list;
  }, [filters, activeLeads, sourceFilter, verificationFilter, approvalFilter, leadStatusFilter, addedDateFilter]);

  const selectedLeadsCount = selectedLeadIds.length;
  const eligibleLeadIds = useMemo(() =>
    leads
      .filter((lead) => {
        const hasValidEmail = lead.email && lead.email.includes("@");
        const isVerified = lead.emailVerificationStatus === "valid";
        const isNotApproved = lead.approvalStatus !== "approved" && lead.approved !== true;
        return hasValidEmail && isVerified && isNotApproved;
      })
      .map((lead) => lead.channelId),
    [leads]
  );

  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const pageStart = filteredLeads.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredLeads.length);
  const paginatedLeads = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, safeCurrentPage, pageSize]);

  const pageButtons = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push(-1);
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push(-1);
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  const currentSearchSummary =
    tableMode === "current"
      ? `Showing ${filteredLeads.length} results from current search`
      : `Showing ${filteredLeads.length} saved leads`;

  useEffect(() => {
    setStats({
      totalLeads: leads.length,
      newLeads: leads.filter((lead) => lead.leadStatus === "New").length,
      contacted: leads.filter((lead) => lead.leadStatus === "Contacted").length,
      replied: leads.filter((lead) => lead.leadStatus === "Replied").length,
      highPotential: leads.filter((lead) => lead.leadScore === "High").length,
    });
  }, [leads]);

  useEffect(() => {
    if (!selectedChannelId && activeLeads[0]) {
      setSelectedChannelId(activeLeads[0].channelId);
      return;
    }
    if (selectedChannelId && !activeLeads.some((lead) => lead.channelId === selectedChannelId) && activeLeads[0]) {
      setSelectedChannelId(activeLeads[0].channelId);
    }
  }, [selectedChannelId, activeLeads]);

  async function runSearch(nextKeywordsText = keywordsText) {
    const keywords = nextKeywordsText
      .split(/[\n,]+/g)
      .map((value) => value.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      setStatusMessage("Enter at least one keyword.");
      return;
    }

    setIsSearching(true);
    setStatusMessage("Searching YouTube channels...");
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, filters }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Search failed");
      }

      const data = (await response.json()) as SearchResponse;

      setLeads(data.leads);
      setCurrentSearchLeads(data.currentSearchLeads);
      setHistory(data.history);
      setStats(data.stats);
      setTableMode("current");
      setStatusMessage(`Showing ${data.currentSearchLeads.length} results from current search.`);
      setSelectedLeadIds([]);
      setSelectedChannelId(data.currentSearchLeads[0]?.channelId ?? "");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  async function viewAllLeads() {
    setStatusMessage("Loading all saved leads...");
    try {
      const response = await fetch("/api/leads");
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to load saved leads");
      }
      const data = (await response.json()) as { leads: LeadRecord[] };
      setLeads(data.leads);
      setTableMode("all");
      setStatusMessage(`Showing ${data.leads.length} saved leads.`);
      setSelectedLeadIds([]);
      setSelectedChannelId(data.leads[0]?.channelId ?? "");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load saved leads");
    }
  }

  async function refreshLeadLists(mode: "current" | "all") {
    if (mode === "current") {
      void runSearch();
    } else {
      await viewAllLeads();
    }
  }

  async function verifySelected() {
    if (selectedLeadIds.length === 0) return;
    setIsVerifying(true);
    try {
      await Promise.all(selectedLeadIds.map(async (channelId) => {
        const response = await fetch(`/api/leads/${encodeURIComponent(channelId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved: true }),
        });
        if (!response.ok) return;
        const updated = (await response.json()) as { lead: LeadRecord };
        setLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
        setCurrentSearchLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
      }));
      setStatusMessage(`Verified ${selectedLeadIds.length} leads.`);
    } catch {
      setStatusMessage("Verification failed");
    } finally {
      setIsVerifying(false);
    }
  }

  async function approveSelected() {
    if (selectedLeadIds.length === 0) return;
    setIsApproving(true);
    try {
      await Promise.all(selectedLeadIds.map(async (channelId) => {
        const response = await fetch(`/api/leads/${encodeURIComponent(channelId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalStatus: "approved" }),
        });
        if (!response.ok) return;
        const updated = (await response.json()) as { lead: LeadRecord };
        setLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
        setCurrentSearchLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
      }));
      setStatusMessage(`Approved ${selectedLeadIds.length} leads.`);
    } catch {
      setStatusMessage("Approval failed");
    } finally {
      setIsApproving(false);
    }
  }

  async function rejectSelected() {
    if (selectedLeadIds.length === 0) return;
    setIsRejecting(true);
    try {
      await Promise.all(selectedLeadIds.map(async (channelId) => {
        const response = await fetch(`/api/leads/${encodeURIComponent(channelId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalStatus: "rejected" }),
        });
        if (!response.ok) return;
        const updated = (await response.json()) as { lead: LeadRecord };
        setLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
        setCurrentSearchLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
      }));
      setStatusMessage(`Rejected ${selectedLeadIds.length} leads.`);
    } catch {
      setStatusMessage("Rejection failed");
    } finally {
      setIsRejecting(false);
    }
  }

  async function verifyAllEligible() {
    if (eligibleLeadIds.length === 0) {
      setStatusMessage("No eligible leads to verify (need valid email verification).");
      return;
    }
    setIsVerifying(true);
    try {
      await Promise.all(eligibleLeadIds.map(async (channelId) => {
        const response = await fetch(`/api/leads/${encodeURIComponent(channelId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved: true }),
        });
        if (!response.ok) return;
        const updated = (await response.json()) as { lead: LeadRecord };
        setLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
        setCurrentSearchLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
      }));
      setStatusMessage(`Verified ${eligibleLeadIds.length} eligible leads.`);
    } catch {
      setStatusMessage("Bulk verification failed");
    } finally {
      setIsVerifying(false);
    }
  }

  async function createSheetFromApproved() {
    const approvedLeadIds = leads.filter((l) => l.approvalStatus === "approved" || l.approved).map((l) => l.channelId);
    if (approvedLeadIds.length === 0) {
      setStatusMessage("No approved leads to create sheet from.");
      return;
    }
    try {
      const response = await fetch("/api/lead-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sheetName || `Leads ${new Date().toLocaleDateString()}`, leadIds: approvedLeadIds }),
      });
      if (!response.ok) throw new Error("Sheet creation failed");
      const data = await response.json();
      setStatusMessage(`Created sheet: ${data.sheet.name}`);
      setSheetName("");
      refreshSheets();
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : "Sheet creation failed");
    }
  }

  async function refreshSheets() {
    try {
      const r = await fetch("/api/lead-sheets");
      const d = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(d.sheets)) setLeadSheets(d.sheets);
    } catch {}
  }

  async function refreshTemplates() {
    try {
      const r = await fetch("/api/bulk-mail/templates");
      const d = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(d.templates)) setTemplates(d.templates);
    } catch {}
  }

  async function handoffSheet(sheetId: string) {
    try {
      const r = await fetch(`/api/lead-sheets/${encodeURIComponent(sheetId)}/handoff`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Handoff not ready");
      setStatusMessage(`READY_FOR_BULK_MAIL: ${d.handoff.sheetName} → Template ${d.handoff.templateName} (${d.handoff.total} leads). No email sent.`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : "Handoff failed"); }
  }

  async function attachTemplate(sheetId: string) {
    if (!selectedTemplateId) { setStatusMessage("Select a template first."); return; }
    try {
      const r = await fetch(`/api/lead-sheets/${encodeURIComponent(sheetId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: Number(selectedTemplateId) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Attach template failed");
      setStatusMessage(`Template attached: ${d.sheet.templateName} → ${d.sheet.status}`);
      refreshSheets();
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : "Attach failed"); }
  }

  async function downloadExport(format: "csv" | "xlsx") {
    setIsExporting(format);
    try {
      const query = leadFiltersToQuery({ ...filters, keywords: [] });
      const response = await fetch(`/api/export?format=${format}&${query}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "csv" ? "swiftgrowthdigital-leads.csv" : "swiftgrowthdigital-leads.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatusMessage(`Downloaded ${format.toUpperCase()}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(null);
    }
  }

  function toggleLeadSelection(leadId: string) {
    setSelectedLeadIds((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId],
    );
  }

  function selectVisibleLeads() {
    setSelectedLeadIds((current) => Array.from(new Set([...current, ...paginatedLeads.map((lead) => lead.channelId)])));
  }

  function clearSelectedLeads() {
    setSelectedLeadIds([]);
  }

  function clearFiltersAndSearch() {
    setKeywordsText("");
    setFilters(defaultFilters);
    setVerificationFilter("all");
    setApprovalFilter("all");
    setSourceFilter("all");
    setLeadStatusFilter("all");
    setAddedDateFilter("");
    setSubscriberPreset("any");
    setStatusMessage("Filters cleared.");
  }

  function saveCurrentView() {
    const payload = {
      keywordsText,
      filters,
      verificationFilter,
      approvalFilter,
      sourceFilter,
      leadStatusFilter,
      addedDateFilter,
      pageSize,
      tableMode,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem("lead-finder-saved-view", JSON.stringify(payload));
    setStatusMessage("Current view saved in this browser.");
  }

  async function sendApprovedLeads() {
    setSendResultMessage(null);
    setIsBulkSending(true);
    setStatusMessage("Sending emails...");

    try {
      const sendableLeadIds = leads
        .filter((lead) => (lead.verified ?? lead.approved) && (lead.sendMail ?? lead.approved) && !lead.emailSentAt)
        .map((lead) => lead.channelId);
      if (sendableLeadIds.length === 0) {
        setStatusMessage("No verified leads available for sending.");
        return;
      }

      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: sendableLeadIds }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Send failed");
      }

      const data = await response.json();
      if (Array.isArray(data.results)) {
        const updatedLeads = leads.map((lead) => {
          const result = data.results.find((item: any) => item.leadId === lead.channelId);
          if (result?.success) {
            const sentAt = new Date().toISOString();
            return {
              ...lead,
              leadStatus: "Contacted" as LeadStatus,
              leadStage: "Sent" as LeadStage,
              approved: true,
              verified: true,
              sendMail: true,
              status: "Sent" as LeadRecord["status"],
              replyStatus: "No Reply" as LeadRecord["replyStatus"],
              sentTime: sentAt,
              emailSentAt: sentAt,
              threadId: lead.threadId ?? lead.emailThreadId ?? "",
              emailThreadId: lead.threadId ?? lead.emailThreadId ?? "",
              followupCount: 0,
            };
          }
          return lead;
        });
        setLeads(updatedLeads);
        setCurrentSearchLeads((current) =>
          current.map((lead) => {
            const result = data.results.find((item: any) => item.leadId === lead.channelId);
            if (result?.success) {
              const sentAt = new Date().toISOString();
              return {
                ...lead,
                leadStatus: "Contacted" as LeadStatus,
                leadStage: "Sent" as LeadStage,
                approved: true,
                verified: true,
                sendMail: true,
                status: "Sent" as LeadRecord["status"],
                replyStatus: "No Reply" as LeadRecord["replyStatus"],
                sentTime: sentAt,
                emailSentAt: sentAt,
                threadId: lead.threadId ?? lead.emailThreadId ?? "",
                emailThreadId: lead.threadId ?? lead.emailThreadId ?? "",
                followupCount: 0,
              };
            }
            return lead;
          }),
        );
        setSendResultMessage(`Email send completed with ${data.results.length} results.`);
      }
      setStatusMessage("Bulk send completed.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Send failed");
    } finally {
      setIsBulkSending(false);
    }
  }

  async function syncToSheets() {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Sheets sync failed");
      }
      const data = (await response.json()) as { appended: number; skippedExisting: number; sheetName: string };
      setStatusMessage(`Synced ${data.appended} leads to ${data.sheetName}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Sheets sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  function rerunHistory(entry: SearchHistoryEntry) {
    setKeywordsText(entry.keywords.join("\n"));
    void runSearch(entry.keywords.join("\n"));
  }

  const panelQuery = leadFiltersToQuery({ ...filters, keywords: [] });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <main className="w-full px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-soft">
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max items-center gap-3 px-1">
              <button
                type="button"
                onClick={() => void verifySelected()}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
                disabled={isVerifying || selectedLeadsCount === 0}
              >
                <BadgeCheck className="h-4 w-4" />
                {isVerifying ? "Verifying..." : `Verify Selected${selectedLeadsCount ? ` (${selectedLeadsCount})` : ""}`}
              </button>
              <button
                type="button"
                onClick={() => void approveSelected()}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
                disabled={isApproving || selectedLeadsCount === 0}
              >
                <BadgeCheck className="h-4 w-4" />
                {isApproving ? "Approving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => void rejectSelected()}
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-60"
                disabled={isRejecting || selectedLeadsCount === 0}
              >
                <BadgeCheck className="h-4 w-4" />
                {isRejecting ? "Rejecting..." : "Reject"}
              </button>
              <button
                type="button"
                onClick={() => void verifyAllEligible()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                disabled={isVerifying || eligibleLeadIds.length === 0}
              >
                <BadgeCheck className="h-4 w-4" />
                Verify All Eligible
              </button>
              <button
                type="button"
                onClick={() => void downloadExport("csv")}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                disabled={isExporting !== null}
              >
                <Download className="h-4 w-4" />
                {isExporting === "csv" ? "Exporting..." : "Export CSV"}
              </button>
              <button
                type="button"
                onClick={() => void downloadExport("xlsx")}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                disabled={isExporting !== null}
              >
                <ArrowDownToLine className="h-4 w-4" />
                {isExporting === "xlsx" ? "Exporting..." : "Export Excel"}
              </button>
              <button
                type="button"
                onClick={() => void syncToSheets()}
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                disabled={isSyncing}
              >
                <Sheet className="h-4 w-4" />
                {isSyncing ? "Syncing..." : "Save to Sheets"}
              </button>
              <button
                type="button"
                onClick={() => void sendApprovedLeads()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                disabled={isBulkSending}
              >
                <CircleDollarSign className="h-4 w-4" />
                {isBulkSending ? "Sending..." : "Send Mail"}
              </button>
              <button
                type="button"
                onClick={() => { void (tableMode === "all" ? refreshLeadLists("all") : runSearch()); }}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-soft">
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="grid min-w-max grid-cols-[minmax(200px,1fr)_repeat(6,minmax(120px,1fr))_auto_auto] items-end gap-3 px-1">
              <Field label="Search">
                <input
                  type="text"
                  value={keywordsText}
                  onChange={(event) => {
                    setKeywordsText(event.target.value);
                    setFilters((current) => ({ ...current, keywordFilter: event.target.value }));
                  }}
                  placeholder="Search by keyword or channel name..."
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Category">
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Country">
                <input
                  type="text"
                  value={filters.country ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))}
                  placeholder="All Countries"
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Subscribers">
                <select
                  value={subscriberPreset}
                  onChange={(event) => {
                    const preset = subscriberPresets.find((item) => item.value === event.target.value) ?? subscriberPresets[0];
                    setSubscriberPreset(preset.value);
                    setFilters((current) => ({
                      ...current,
                      minSubscribers: preset.min,
                      maxSubscribers: preset.max,
                    }));
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {subscriberPresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Verification">
                <select
                  value={verificationFilter}
                  onChange={(event) => setVerificationFilter(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {verificationOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Approval">
                <select
                  value={approvalFilter}
                  onChange={(event) => setApprovalFilter(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {approvalOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Lead Status">
                <select
                  value={leadStatusFilter}
                  onChange={(event) => setLeadStatusFilter(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All</option>
                  {leadStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </Field>
              <Field label="Added Date">
                <input
                  type="date"
                  value={addedDateFilter}
                  onChange={(event) => setAddedDateFilter(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <button
                type="button"
                onClick={() => void runSearch()}
                className="inline-flex h-[42px] items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
                disabled={isSearching}
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
              <button
                type="button"
                onClick={() => clearFiltersAndSearch()}
                className="inline-flex h-[42px] items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => saveCurrentView()}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Save className="h-4 w-4" />
                Save as View
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 min-w-0 rounded-xl border border-slate-200 bg-white shadow-soft">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-slate-900">
                  Showing {pageStart} to {pageEnd} of {filteredLeads.length.toLocaleString()} leads
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{currentSearchSummary}</span>
                  <span>Current Search: {currentSearchCount.toLocaleString()}</span>
                  <span>Total Saved: {totalSavedCount.toLocaleString()}</span>
                  <span>Selected: {selectedLeadsCount}</span>
                  <span>Eligible: {eligibleLeadIds.length}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTableMode("current");
                    setSelectedLeadIds([]);
                  }}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                    tableMode === "current"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Current Search Results
                </button>
                <button
                  type="button"
                  onClick={() => void viewAllLeads()}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                    tableMode === "all"
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  View All Leads
                </button>
                <select
                  value={String(pageSize)}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>{size} per page</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p>{statusMessage}</p>
              {sendResultMessage ? <p className="mt-1 text-slate-500">{sendResultMessage}</p> : null}
            </div>
          </div>
          <div className="lead-table-scroll overflow-x-auto overflow-y-hidden max-w-full">
            <table className="w-full min-w-[1200px] divide-y divide-slate-100 text-left text-[12px] table-fixed">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                <tr>
                  <Th sticky="left" left={STICKY_CHECKBOX_LEFT} className="w-8 shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedLeadsCount > 0 && selectedLeadsCount === paginatedLeads.length}
                      onChange={(event) => {
                        if (event.target.checked) selectVisibleLeads();
                        else clearSelectedLeads();
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                  </Th>
                  <Th sticky="left" left={STICKY_INDEX_LEFT} className="w-8 shrink-0">#</Th>
                  <Th sticky="left" left={STICKY_NAME_LEFT} className="min-w-[240px] max-w-[320px]">Lead / Channel</Th>
                  <Th className="min-w-[100px] max-w-[140px]">Category</Th>
                  <Th className="min-w-[70px] max-w-[100px] shrink-0">Country</Th>
                  <Th className="min-w-[80px] max-w-[100px] shrink-0">Subscribers</Th>
                  <Th className="min-w-[70px] max-w-[90px] shrink-0">Views</Th>
                  <Th className="min-w-[50px] max-w-[70px] shrink-0">Videos</Th>
                  <Th sticky="left" left={STICKY_EMAIL_LEFT} className="min-w-[180px] max-w-[240px]">Email</Th>
                  <Th sticky="left" left={STICKY_VERIFICATION_LEFT} className="min-w-[100px] max-w-[130px] shrink-0">Verification</Th>
                  <Th className="min-w-[90px] max-w-[120px] shrink-0">Approval</Th>
                  <Th className="min-w-[60px] max-w-[80px] shrink-0">Age</Th>
                  <Th className="min-w-[90px] max-w-[110px] shrink-0">Lead Score</Th>
                  <Th className="min-w-[80px] max-w-[100px] shrink-0">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLeads.map((lead, index) => (
                  <tr
                    key={lead.channelId}
                    className={`transition hover:bg-slate-50 ${selectedChannelId === lead.channelId ? "bg-blue-50/60" : ""}`}
                  >
                    <Td sticky="left" left={STICKY_CHECKBOX_LEFT} className="w-8 shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.channelId)}
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleLeadSelection(lead.channelId);
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </Td>
                    <Td sticky="left" left={STICKY_INDEX_LEFT} className="w-8 shrink-0 text-center text-slate-500 font-mono">
                      {(safeCurrentPage - 1) * pageSize + index + 1}
                    </Td>
                    <Td sticky="left" left={STICKY_NAME_LEFT} className="min-w-[240px] max-w-[320px]">
                      <div className="flex items-center gap-2 py-1.5">
                        {lead.thumbnail ? (
                          <Image
                            src={lead.thumbnail}
                            alt=""
                            width={28}
                            height={28}
                            unoptimized
                            className="h-7 w-7 rounded border border-slate-200 object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600 shrink-0">
                            {lead.channelName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium text-slate-900 text-sm">{lead.channelName}</p>
                            <a
                              href={lead.channelUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center text-slate-400 hover:text-slate-600 shrink-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <p className="truncate text-[11px] text-slate-500">{lead.searchKeyword}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="min-w-[100px] max-w-[140px]">
                      <span className="inline-flex rounded-full border px-1.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border-slate-200 truncate block max-w-full">
                        {lead.source || "youtube"}
                      </span>
                    </Td>
                    <Td className="min-w-[70px] max-w-[100px] shrink-0 whitespace-nowrap">{lead.country || "—"}</Td>
                    <Td className="min-w-[80px] max-w-[100px] shrink-0 whitespace-nowrap font-mono tabular-nums">{formatCompactNumber(lead.subscribers)}</Td>
                    <Td className="min-w-[70px] max-w-[90px] shrink-0 whitespace-nowrap font-mono tabular-nums">{formatCompactNumber(lead.viewCount)}</Td>
                    <Td className="min-w-[50px] max-w-[70px] shrink-0 whitespace-nowrap font-mono tabular-nums">{formatCompactNumber(lead.videoCount)}</Td>
                    <Td sticky="left" left={STICKY_EMAIL_LEFT} className="min-w-[180px] max-w-[240px]">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline truncate block max-w-full text-sm">{lead.email}</a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td sticky="left" left={STICKY_VERIFICATION_LEFT} className="min-w-[100px] max-w-[130px] shrink-0">
                      {lead.emailVerificationStatus ? (
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${verificationBadge(lead.emailVerificationStatus)}`}>
                          {lead.emailVerificationStatus.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Not verified</span>
                      )}
                    </Td>
                    <Td className="min-w-[90px] max-w-[120px] shrink-0">
                      {lead.approvalStatus ? (
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${approvalBadge(lead.approvalStatus)}`}>
                          {lead.approvalStatus === "pending_review" ? "Pending" : lead.approvalStatus}
                        </span>
                      ) : (
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${lead.approved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {lead.approved ? "Approved" : "Pending"}
                        </span>
                      )}
                    </Td>
                    <Td className="min-w-[60px] max-w-[80px] shrink-0 whitespace-nowrap text-slate-600">{formatAge(lead.ageInYears)}</Td>
                    <Td className="min-w-[90px] max-w-[110px] shrink-0">
                      <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${badgeClasses(lead.leadScore)}`}>
                        {lead.leadScore}
                      </span>
                    </Td>
                    <Td className="min-w-[80px] max-w-[100px] shrink-0 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedChannelId(lead.channelId); }}
                          className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                          title="View details"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleLeadSelection(lead.channelId); }}
                          className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                          title="Select"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.includes(lead.channelId)}
                            onChange={() => {}}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500 pointer-events-none"
                          />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-10 text-center text-sm text-slate-500">
                      {tableMode === "current"
                        ? "No leads match the current search results."
                        : "No saved leads available."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Pagination</h2>
              <p className="text-xs text-slate-500">
                Page {safeCurrentPage} of {totalPages}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              {pageButtons.map((page, index) => (
                <div key={page} className="flex items-center gap-2">
                  {index > 0 && page - pageButtons[index - 1] > 1 ? <span className="text-slate-400">...</span> : null}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      page === safeCurrentPage
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {page === -1 ? "…" : page}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <details className="mt-4 rounded-xl border border-slate-200 bg-white shadow-soft">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
            Lead Sheets & Bulk Mail Handoff
          </summary>
          <div className="border-t border-slate-100 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Sheet name e.g. Bihar News Outreach - 27 Aug"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => void createSheetFromApproved()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Create Sheet from Approved
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Sheet</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Leads</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Approved / Rejected</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Verification</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Template</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Send At</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leadSheets.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">No sheets yet. Approve some leads and create one.</td></tr>
                  ) : leadSheets.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 font-medium">{s.name}<br/><span className="text-xs text-slate-500">{new Date(s.createdAt ?? s.createdAt).toLocaleDateString()}</span></td>
                      <td className="px-3 py-2">{s.totalLeads}</td>
                      <td className="px-3 py-2">{s.approvedLeads} / {s.rejectedLeads}</td>
                      <td className="px-3 py-2 text-xs">{s.verificationSummary ? `${s.verificationSummary.valid ?? 0} valid, ${s.verificationSummary.invalid ?? 0} invalid` : "-"}</td>
                      <td className="px-3 py-2">
                        <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-xs">
                          <option value="">Select template</option>
                          {templates.map((tpl) => <option key={tpl.id} value={String(tpl.id)}>{tpl.name} ({tpl.category})</option>)}
                        </select>
                        <button type="button" onClick={() => void attachTemplate(s.id)} className="ml-2 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Attach</button>
                        {s.templateName ? <div className="mt-1 text-xs text-emerald-600">{s.templateName}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {s.sendAt ? new Date(s.sendAt).toLocaleString() : <span className="text-slate-400">Not scheduled</span>}
                        <div className="mt-1 flex gap-1">
                          <input type="datetime-local" id={`sendAt-${s.id}`} defaultValue={s.sendAt ? new Date(new Date(s.sendAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} className="w-32 rounded border border-slate-200 px-1 py-0.5 text-[10px]" />
                          <button type="button" onClick={async () => {
                            const el = document.getElementById(`sendAt-${s.id}`) as HTMLInputElement;
                            const val = el?.value ? new Date(el.value).toISOString() : null;
                            const res = await fetch(`/api/lead-sheets/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sendAt: val }) });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) alert(data.error || "Failed");
                            else location.reload();
                          }} className="rounded border border-slate-200 px-1 py-0.5 text-[10px] hover:bg-slate-50">Set</button>
                        </div>
                      </td>
                      <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-xs ${s.status === "scheduled" ? "bg-sky-50 text-sky-700 border-sky-200" : s.status === "ready_for_bulk_mail" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s.status === "sending" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600"}`}>{s.status}</span></td>
                      <td className="px-3 py-2"><button type="button" onClick={() => void handoffSheet(s.id)} className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500">Handoff</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Bulk Mail handoff is read-only — returns <code>READY_FOR_BULK_MAIL</code> with leadIds/emails/templateId. No SMTP/queue is created here.</p>
          </div>
        </details>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Th({ children, className, sticky, left = 0 }: { children: ReactNode; className?: string; sticky?: "left"; left?: number }) {
  return (
    <th
      className={`whitespace-nowrap px-2 py-2 text-[11px] font-semibold uppercase tracking-wide ${sticky ? "sticky z-20 bg-slate-50" : ""} ${className ?? ""}`}
      style={sticky ? { left } : undefined}
    >
      {children}
    </th>
  );
}

function Td({ children, className, sticky, left = 0 }: { children: ReactNode; className?: string; sticky?: "left"; left?: number }) {
  return (
    <td
      className={`px-2 py-1.5 align-middle ${sticky ? "sticky z-10 bg-white shadow-[1px_0_0_0_rgba(226,232,240,0.9)]" : ""} ${className ?? ""}`}
      style={sticky ? { left } : undefined}
    >
      {children}
    </td>
  );
}
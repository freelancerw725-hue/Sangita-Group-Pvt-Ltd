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
  Edit,
  Trash2,
  Plus,
  X,
  Check,
  Loader2,
  AlertCircle,
  Mail,
  Globe,
  MapPin,
  Tag,
  Phone,
  MessageSquare,
  Users,
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

type EditingFields = Omit<Partial<LeadRecord>, "tags"> & { tags?: string; channelUrl?: string };

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

function verificationBadge(status?: EmailVerificationStatus) {
  switch (status) {
    case "valid": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "invalid": return "bg-rose-50 text-rose-700 border-rose-200";
    case "risky": return "bg-amber-50 text-amber-700 border-amber-200";
    case "unknown": return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-zinc-100 text-zinc-500 border-zinc-200";
  }
}
function approvalBadge(status?: ApprovalStatus) {
  switch (status) {
    case "approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected": return "bg-rose-50 text-rose-700 border-rose-200";
    case "pending_review": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-slate-100 text-slate-500 border-slate-200";
  }
}
const verificationOptions: { value: string; label: string }[] = [
  { value: "all", label: "All verification" },
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
  { value: "risky", label: "Risky" },
  { value: "unknown", label: "Unknown" },
  { value: "not_verified", label: "Not verified" },
];
const approvalOptions: { value: string; label: string }[] = [
  { value: "all", label: "All approval" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const sourceOptions = [
  { value: "all", label: "All" },
  { value: "youtube", label: "YouTube" },
  { value: "google_maps", label: "Google Maps" },
  { value: "news", label: "News" },
  { value: "real_estate", label: "Real Estate" },
  { value: "local_business", label: "Local Business" },
] as const;

const STICKY_CHECKBOX_LEFT = 0;
const STICKY_INDEX_LEFT = 56;
const STICKY_NAME_LEFT = 120;
const STICKY_EMAIL_LEFT = 1000;
const STICKY_VERIFICATION_LEFT = 1260;

const subscriberPresets = [
  { value: "any", label: "Any", min: undefined, max: undefined },
  { value: "under100k", label: "Under 100K", min: undefined, max: 100_000 },
  { value: "100kto1m", label: "100K - 1M", min: 100_000, max: 1_000_000 },
  { value: "1mto5m", label: "1M - 5M", min: 1_000_000, max: 5_000_000 },
  { value: "5mplus", label: "5M+", min: 5_000_000, max: undefined },
] as const;

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
  const [notes, setNotes] = useState("");
  const [leadStatus, setLeadStatus] = useState<LeadStatus>("New");
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [sendResultMessage, setSendResultMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState<"csv" | "xlsx" | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [leadSheets, setLeadSheets] = useState<Array<import("@/lib/types").LeadSheet>>([]);
  const [sheetName, setSheetName] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: number; name: string; category: string }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");
  const [addedDateFilter, setAddedDateFilter] = useState<string>("");
  const [subscriberPreset, setSubscriberPreset] = useState<string>("any");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Inline editing state
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState<Record<string, EditingFields>>({});
  const [savingChannelId, setSavingChannelId] = useState<string | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({
    channelId: "",
    channelName: "",
    channelUrl: "",
    subscribers: 0,
    videoCount: 0,
    viewCount: 0,
    description: "",
    country: "",
    customUrl: "",
    thumbnail: "",
    publishedAt: "",
    ageInYears: 0,
    website: "",
    email: "",
    phone: "",
    instagram: "",
    facebook: "",
    telegram: "",
    appAvailable: false,
    websiteAvailable: false,
    source: "youtube" as const,
    searchKeyword: "manual",
    leadScore: "Low" as const,
    leadStatus: "New" as const,
    leadStage: "New" as const,
    notes: "",
    crmNotes: "",
    leadOwner: "",
    tags: "",
  });
  const [addLeadError, setAddLeadError] = useState<string | null>(null);
  const [isAddingLead, setIsAddingLead] = useState(false);

  const activeLeads = tableMode === "all" ? leads : currentSearchLeads;
  const currentSearchCount = currentSearchLeads.length;
  const totalSavedCount = leads.length;

  useEffect(() => {
    setStats({
      totalLeads: leads.length,
      newLeads: leads.filter((lead) => lead.leadStatus === "New").length,
      contacted: leads.filter((lead) => lead.leadStatus === "Contacted").length,
      replied: leads.filter((lead) => lead.leadStatus === "Replied").length,
      highPotential: leads.filter((lead) => lead.leadScore === "High").length,
    });
  }, [leads]);

  useEffect(() => { refreshSheets(); refreshTemplates(); }, []);

  useEffect(() => {
    if (!selectedChannelId && activeLeads[0]) {
      setSelectedChannelId(activeLeads[0].channelId);
      return;
    }
    if (selectedChannelId && !activeLeads.some((lead) => lead.channelId === selectedChannelId) && activeLeads[0]) {
      setSelectedChannelId(activeLeads[0].channelId);
      return;
    }

    const selected = activeLeads.find((lead) => lead.channelId === selectedChannelId);
    if (selected) {
      setLeadStatus(selected.leadStatus);
      setNotes(selected.notes);
    }
  }, [selectedChannelId, activeLeads]);

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
      if (verificationFilter !== "all" && (lead.emailVerificationStatus ?? "not_verified") !== verificationFilter) return false;
      if (approvalFilter !== "all" && (lead.approvalStatus ?? "pending_review") !== approvalFilter) return false;
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      if (leadStatusFilter !== "all" && lead.leadStatus !== leadStatusFilter) return false;
      if (addedDateFilter) {
        const leadDate = new Date(lead.addedDate);
        const selectedDate = new Date(addedDateFilter);
        selectedDate.setHours(0, 0, 0, 0);
        if (leadDate < selectedDate) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (filters.sortBy === "views") return b.viewCount - a.viewCount;
      if (filters.sortBy === "videos") return b.videoCount - a.videoCount;
      return b.subscribers - a.subscribers;
    });

    return list;
  }, [filters, activeLeads, verificationFilter, approvalFilter, sourceFilter, leadStatusFilter, addedDateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, tableMode, verificationFilter, approvalFilter, sourceFilter, leadStatusFilter, addedDateFilter, pageSize]);

  const selectedLead = filteredLeads.find((lead) => lead.channelId === selectedChannelId) ?? activeLeads.find((lead) => lead.channelId === selectedChannelId) ?? null;
  const currentSearchSummary =
    tableMode === "current"
      ? `Showing ${filteredLeads.length} results from current search`
      : `Showing ${filteredLeads.length} saved leads`;
  const eligibleLeadIds = useMemo(
    () =>
      filteredLeads
        .filter((lead) => lead.email?.trim() && (lead.emailVerificationStatus ?? "not_verified") === "not_verified")
        .map((lead) => lead.channelId),
    [filteredLeads],
  );
  const selectedLeadsCount = selectedLeadIds.length;
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLeads = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, safeCurrentPage, pageSize]);
  const pageStart = filteredLeads.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(filteredLeads.length, safeCurrentPage * pageSize);
  const areAllVisibleSelected = paginatedLeads.length > 0 && paginatedLeads.every((lead) => selectedLeadIds.includes(lead.channelId));
  const pageButtons = useMemo(() => {
    const pages = new Set<number>([1, totalPages, safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [safeCurrentPage, totalPages]);

  const verifyDisabled = isVerifying || selectedLeadsCount === 0;
  const approveDisabled = isApproving || selectedLeadsCount === 0;
  const rejectDisabled = isRejecting || selectedLeadsCount === 0;
  const verifyAllDisabled = isVerifying || eligibleLeadIds.length === 0;
  const exportDisabled = isExporting !== null;
  const syncDisabled = isSyncing;
  const refreshDisabled = false;
  const sendDisabled = isBulkSending;
  const addLeadDisabled = isAddingLead;

  function syncLeadSnapshots(nextLeads: LeadRecord[]) {
    setLeads(nextLeads);
    setCurrentSearchLeads((current) => current.map((lead) => nextLeads.find((item) => item.channelId === lead.channelId) ?? lead));
  }

  async function refreshLeadLists(mode: "current" | "all" = tableMode) {
    const response = await fetch("/api/leads");
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data.leads)) {
      throw new Error(data.error || "Failed to refresh leads");
    }

    syncLeadSnapshots(data.leads);
    if (mode === "all") {
      setTableMode("all");
    }
    return data.leads as LeadRecord[];
  }

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
        body: JSON.stringify({
          keywords,
          filters,
        }),
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

  async function updateLead(channelId: string, nextStatus: LeadStatus, nextNotes: string) {
    setIsSaving(true);
    setStatusMessage("Saving lead...");
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(channelId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadStatus: nextStatus, notes: nextNotes }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save lead");
      }
      const updated = (await response.json()) as { lead: LeadRecord };
      setLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
      setCurrentSearchLeads((current) => current.map((lead) => (lead.channelId === channelId ? updated.lead : lead)));
      setStatusMessage("Lead saved.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save lead");
    } finally {
      setIsSaving(false);
    }
  }

  // Inline editing functions
  function startEditing(channelId: string) {
    setEditingChannelId(channelId);
    const lead = leads.find((l) => l.channelId === channelId) ?? currentSearchLeads.find((l) => l.channelId === channelId);
    if (lead) {
      setEditingFields((prev) => ({
        ...prev,
        [channelId]: {
          email: lead.email ?? "",
          website: lead.website ?? "",
          channelName: lead.channelName ?? "",
          country: lead.country ?? "",
          source: lead.source,
          phone: lead.phone ?? "",
          instagram: lead.instagram ?? "",
          facebook: lead.facebook ?? "",
          telegram: lead.telegram ?? "",
          leadScore: lead.leadScore,
          leadStatus: lead.leadStatus,
          leadStage: lead.leadStage ?? "New",
          notes: lead.notes ?? "",
          crmNotes: lead.crmNotes ?? "",
          leadOwner: lead.leadOwner ?? "",
          tags: lead.tags?.join(", ") ?? "",
          emailVerificationStatus: lead.emailVerificationStatus,
          approvalStatus: lead.approvalStatus,
        },
      }));
    }
  }

  function cancelEditing(channelId: string) {
    setEditingChannelId(null);
    setEditingFields((prev) => {
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }

  async function saveEditing(channelId: string) {
    const fields = editingFields[channelId];
    if (!fields) return;

    setSavingChannelId(channelId);
    setStatusMessage("Saving changes...");

    try {
      // Convert tags string back to array
      const tagsValue = fields.tags;
      const patch: Partial<LeadRecord> = { ...fields } as Partial<LeadRecord>;
      if (typeof tagsValue === "string") {
        patch.tags = tagsValue.split(",").map((t: string) => t.trim()).filter(Boolean);
      }

      const response = await fetch(`/api/leads/${encodeURIComponent(channelId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save lead");
      }

      const data = (await response.json()) as { lead: LeadRecord };
      setLeads((current) => current.map((lead) => (lead.channelId === channelId ? data.lead : lead)));
      setCurrentSearchLeads((current) => current.map((lead) => (lead.channelId === channelId ? data.lead : lead)));
      setStatusMessage("Changes saved successfully.");
      cancelEditing(channelId);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setSavingChannelId(null);
    }
  }

  async function deleteLead(channelId: string) {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      return;
    }

    setDeletingChannelId(channelId);
    setStatusMessage("Deleting lead...");

    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(channelId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete lead");
      }

      setLeads((current) => current.filter((lead) => lead.channelId !== channelId));
      setCurrentSearchLeads((current) => current.filter((lead) => lead.channelId !== channelId));
      setStatusMessage("Lead deleted successfully.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to delete lead");
    } finally {
      setDeletingChannelId(null);
    }
  }

  async function createLead() {
    if (!addLeadForm.channelId.trim() || !addLeadForm.channelName.trim()) {
      setAddLeadError("Channel ID and Channel Name are required.");
      return;
    }

    setIsAddingLead(true);
    setAddLeadError(null);
    setStatusMessage("Creating lead...");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addLeadForm,
          subscribers: Number(addLeadForm.subscribers) || 0,
          videoCount: Number(addLeadForm.videoCount) || 0,
          viewCount: Number(addLeadForm.viewCount) || 0,
          ageInYears: Number(addLeadForm.ageInYears) || 0,
          tags: addLeadForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
          email: addLeadForm.email || undefined,
          website: addLeadForm.website || undefined,
          phone: addLeadForm.phone || undefined,
          instagram: addLeadForm.instagram || undefined,
          facebook: addLeadForm.facebook || undefined,
          telegram: addLeadForm.telegram || undefined,
          notes: addLeadForm.notes || undefined,
          crmNotes: addLeadForm.crmNotes || undefined,
          leadOwner: addLeadForm.leadOwner || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create lead");
      }

      const data = (await response.json()) as { lead: LeadRecord };
      setLeads((current) => [data.lead, ...current]);
      if (tableMode === "current") {
        setCurrentSearchLeads((current) => [data.lead, ...current]);
      }
      setStatusMessage("Lead created successfully.");
      closeAddLeadModal();
    } catch (error) {
      setAddLeadError(error instanceof Error ? error.message : "Failed to create lead");
    } finally {
      setIsAddingLead(false);
    }
  }

  function openAddLeadModal() {
    setAddLeadForm({
      channelId: "",
      channelName: "",
      channelUrl: "",
      subscribers: 0,
      videoCount: 0,
      viewCount: 0,
      description: "",
      country: "",
      customUrl: "",
      thumbnail: "",
      publishedAt: "",
      ageInYears: 0,
      website: "",
      email: "",
      phone: "",
      instagram: "",
      facebook: "",
      telegram: "",
      appAvailable: false,
      websiteAvailable: false,
      source: "youtube",
      searchKeyword: "manual",
      leadScore: "Low",
      leadStatus: "New",
      leadStage: "New",
      notes: "",
      crmNotes: "",
      leadOwner: "",
      tags: "",
    });
    setAddLeadError(null);
    setShowAddLeadModal(true);
  }

  function closeAddLeadModal() {
    setShowAddLeadModal(false);
  }

  function handleAddLeadChange(field: string, value: string | number | boolean) {
    setAddLeadForm((prev) => ({ ...prev, [field]: value }));
  }

function handleEditingChange(channelId: string, field: string, value: string | string[] | number | boolean | undefined) {
    setEditingFields((prev) => ({
      ...prev,
      [channelId]: { ...(prev[channelId] ?? {}), [field]: value },
    }));
  }

  async function verifyLeadIds(leadIds: string[], label: string) {
    if (leadIds.length === 0) {
      setStatusMessage(`No eligible leads found for ${label.toLowerCase()}.`);
      return;
    }

    setIsVerifying(true);
    setStatusMessage(`${label} ${leadIds.length} emails...`);
    try {
      const res = await fetch("/api/automation/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed");
      const jobId = data.jobId as string;
      setStatusMessage(`Verification started (${jobId}). Polling...`);
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const pr = await fetch(`/api/automation/verify/${encodeURIComponent(jobId)}`);
        const pj = await pr.json().catch(() => ({}));
        if (pj.status === "completed") {
          setStatusMessage(`${label} completed: ${pj.valid} valid, ${pj.invalid} invalid, ${pj.risky} risky.`);
          await refreshLeadLists();
          break;
        }
        if (pj.status === "failed") throw new Error(pj.errorMessage || "Verification failed");
      }
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  }

  async function verifySelected() {
    await verifyLeadIds(selectedLeadIds, "Verifying");
  }

  async function verifyAllEligible() {
    await verifyLeadIds(eligibleLeadIds, "Verifying");
  }

  async function approveSelected() {
    if (selectedLeadIds.length === 0) { setStatusMessage("Select leads to approve."); return; }
    setIsApproving(true); setStatusMessage(`Approving ${selectedLeadIds.length} leads...`);
    try {
      const res = await fetch("/api/leads/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedLeadIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Approve failed");
      await refreshLeadLists();
      setStatusMessage(`Approved ${data.updated ?? selectedLeadIds.length} leads.`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : "Approve failed"); }
    finally { setIsApproving(false); }
  }

  async function rejectSelected() {
    if (selectedLeadIds.length === 0) { setStatusMessage("Select leads to reject."); return; }
    setIsRejecting(true); setStatusMessage(`Rejecting ${selectedLeadIds.length} leads...`);
    try {
      const res = await fetch("/api/leads/bulk-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedLeadIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reject failed");
      await refreshLeadLists();
      setStatusMessage(`Rejected ${data.updated ?? selectedLeadIds.length} leads.`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : "Reject failed"); }
    finally { setIsRejecting(false); }
  }

  async function createSheetFromApproved() {
    const approved = filteredLeads.filter((l) => l.approvalStatus === "approved");
    const ids = approved.length ? approved.map((l) => l.channelId) : selectedLeadIds;
    if (ids.length === 0) { setStatusMessage("No approved leads to create sheet."); return; }
    const name = sheetName.trim() || `Leads Sheet - ${new Date().toLocaleDateString()}`;
    try {
      const res = await fetch("/api/lead-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, leadIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Create sheet failed");
      setStatusMessage(`Sheet created: ${data.sheet.name} (${data.sheet.totalLeads} leads).`);
      setSheetName(""); refreshSheets();
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : "Create sheet failed"); }
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

  // load sheets/templates on mount
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

  function selectAllFilteredLeads() {
    setSelectedLeadIds(filteredLeads.map((lead) => lead.channelId));
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
        body: JSON.stringify({
          keywords: keywordsText,
          leads: currentSearchLeads,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Sheets sync failed");
      }
      const data = (await response.json()) as {
        appended: number;
        tabName: string;
        state: string;
      };
      if (data.appended > 0) {
        setStatusMessage(`Saved ${data.appended} leads → ${data.tabName}`);
      } else {
        setStatusMessage(`No new leads to save (all duplicates).`);
      }
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
                disabled={verifyDisabled}
              >
                <BadgeCheck className="h-4 w-4" />
                {isVerifying ? "Verifying..." : `Verify Selected${selectedLeadsCount ? ` (${selectedLeadsCount})` : ""}`}
              </button>
              <button
                type="button"
                onClick={() => void approveSelected()}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
                disabled={approveDisabled}
              >
                <BadgeCheck className="h-4 w-4" />
                {isApproving ? "Approving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => void rejectSelected()}
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-60"
                disabled={rejectDisabled}
              >
                <BadgeCheck className="h-4 w-4" />
                {isRejecting ? "Rejecting..." : "Reject"}
              </button>
              <button
                type="button"
                onClick={() => void verifyAllEligible()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                disabled={verifyAllDisabled}
              >
                <BadgeCheck className="h-4 w-4" />
                Verify All Eligible
              </button>
              <button
                type="button"
                onClick={() => void downloadExport("csv")}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                disabled={exportDisabled}
              >
                <Download className="h-4 w-4" />
                {isExporting === "csv" ? "Exporting..." : "Export CSV"}
              </button>
              <button
                type="button"
                onClick={() => void downloadExport("xlsx")}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                disabled={exportDisabled}
              >
                <ArrowDownToLine className="h-4 w-4" />
                {isExporting === "xlsx" ? "Exporting..." : "Export Excel"}
              </button>
              <button
                type="button"
                onClick={() => void syncToSheets()}
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                disabled={syncDisabled}
              >
                <Sheet className="h-4 w-4" />
                {isSyncing ? "Syncing..." : "Save to Sheets"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void (tableMode === "all" ? refreshLeadLists("all") : runSearch());
                }}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                disabled={refreshDisabled}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void sendApprovedLeads()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                disabled={sendDisabled}
              >
                <CircleDollarSign className="h-4 w-4" />
                {isBulkSending ? "Sending..." : "Send Mail"}
              </button>
              <button
                type="button"
                onClick={() => openAddLeadModal()}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
                disabled={addLeadDisabled}
              >
                <Plus className="h-4 w-4" />
                {isAddingLead ? "Adding..." : "Add Lead"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-soft">
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="grid min-w-max grid-cols-[minmax(240px,1.6fr)_repeat(7,minmax(120px,1fr))_auto_auto_auto] items-end gap-3 px-1">
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
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
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
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Verification Status">
                <select
                  value={verificationFilter}
                  onChange={(event) => setVerificationFilter(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {verificationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Approval Status">
                <select
                  value={approvalFilter}
                  onChange={(event) => setApprovalFilter(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {approvalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
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
                    <option key={status} value={status}>
                      {status}
                    </option>
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
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>{statusMessage}</p>
                {sendResultMessage ? <p className="mt-1 text-slate-500">{sendResultMessage}</p> : null}
              </div>
            </div>
            <div className="lead-table-scroll overflow-x-auto overflow-y-hidden">
              <table className="min-w-[1650px] divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <Th sticky="left" left={STICKY_CHECKBOX_LEFT} className="w-14 min-w-[56px]">
                      <input
                        type="checkbox"
                        checked={areAllVisibleSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            selectVisibleLeads();
                          } else {
                            clearSelectedLeads();
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </Th>
                    <Th sticky="left" left={STICKY_INDEX_LEFT} className="min-w-[64px]">#</Th>
                    <Th sticky="left" left={STICKY_NAME_LEFT} className="min-w-[340px]">Lead / Channel</Th>
                    <Th className="min-w-[120px]">Category</Th>
                    <Th className="min-w-[90px]">Country</Th>
                    <Th className="min-w-[120px]">Subscribers</Th>
                    <Th className="min-w-[110px]">Views</Th>
                    <Th className="min-w-[100px]">Videos</Th>
                    <Th sticky="left" left={STICKY_EMAIL_LEFT} className="min-w-[260px]">Email</Th>
                    <Th sticky="left" left={STICKY_VERIFICATION_LEFT} className="min-w-[160px]">Verification</Th>
<Th className="min-w-[120px]">Lead Score</Th>
                      <Th className="min-w-[180px]">Added Date</Th>
                      <Th className="min-w-[160px]">Batch</Th>
                      <Th className="min-w-[120px]">Approval</Th>
                      <Th className="min-w-[90px]">Age</Th>
                      <Th className="min-w-[120px]">Lead Status</Th>
                      <Th className="min-w-[90px]">Score</Th>
                      <Th className="min-w-[140px]">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLeads.map((lead, index) => {
                    const isEditing = editingChannelId === lead.channelId;
                    const editFields = editingFields[lead.channelId] || {};
                    const isSaving = savingChannelId === lead.channelId;
                    const isDeleting = deletingChannelId === lead.channelId;

                    return (
                      <tr
                        key={lead.channelId}
                        className={`transition ${selectedChannelId === lead.channelId ? "bg-blue-50/60" : ""} ${isEditing ? "bg-amber-50/30" : "hover:bg-slate-50"}`}
                        onClick={isEditing ? undefined : () => setSelectedChannelId(lead.channelId)}
                      >
                        <Td sticky="left" left={STICKY_CHECKBOX_LEFT} className="w-14 min-w-[56px]">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.includes(lead.channelId)}
                            onChange={(event) => {
                              event.stopPropagation();
                              toggleLeadSelection(lead.channelId);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                            disabled={isEditing}
                          />
                        </Td>
                        <Td sticky="left" left={STICKY_INDEX_LEFT} className="min-w-[64px] text-sm font-medium text-slate-500">
                          {(safeCurrentPage - 1) * pageSize + index + 1}
                        </Td>
                        <Td sticky="left" left={STICKY_NAME_LEFT} className="min-w-[340px]">
                          <div className="flex items-center gap-3 py-3">
                            {lead.thumbnail ? (
                              <Image
                                src={lead.thumbnail}
                                alt=""
                                width={40}
                                height={40}
                                unoptimized
                                className="h-10 w-10 rounded-md border border-slate-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600">
                                {(editFields.channelName || lead.channelName).slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              {isEditing ? (
                                <div className="flex flex-col gap-1 min-w-0">
                                  <input
                                    type="text"
                                    value={editFields.channelName ?? lead.channelName}
                                    onChange={(e) => handleEditingChange(lead.channelId, "channelName", e.target.value)}
                                    className="w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                                    placeholder="Channel name"
                                  />
                                  <input
                                    type="url"
                                    value={editFields.channelUrl ?? lead.channelUrl}
                                    onChange={(e) => handleEditingChange(lead.channelId, "channelUrl", e.target.value)}
                                    className="w-full min-w-0 px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                                    placeholder="Channel URL"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="truncate font-medium text-slate-900">{lead.channelName}</p>
                                  <a
                                    href={lead.channelUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(event) => event.stopPropagation()}
                                    className="inline-flex items-center text-slate-400 hover:text-slate-600"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              )}
                              <p className="truncate text-xs text-slate-500">{lead.searchKeyword}</p>
                            </div>
                          </div>
                        </Td>
                        <Td className="min-w-[120px]">
                          {isEditing ? (
                            <select
                              value={editFields.source ?? lead.source}
                              onChange={(e) => handleEditingChange(lead.channelId, "source", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                            >
                              {sourceOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                              {lead.source.replace("_", " ")}
                            </span>
                          )}
                        </Td>
                        <Td className="min-w-[90px]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFields.country ?? lead.country ?? ""}
                              onChange={(e) => handleEditingChange(lead.channelId, "country", e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                              placeholder="Country"
                            />
                          ) : (
                            lead.country || "-"
                          )}
                        </Td>
                        <Td className="min-w-[120px]">{formatCompactNumber(lead.subscribers)}</Td>
                        <Td className="min-w-[110px]">{formatCompactNumber(lead.viewCount)}</Td>
                        <Td className="min-w-[100px]">{formatCompactNumber(lead.videoCount)}</Td>
                        <Td sticky="left" left={STICKY_EMAIL_LEFT} className="min-w-[260px]">
                          {isEditing ? (
                            <div className="flex flex-col gap-1 min-w-0">
                              <input
                                type="email"
                                value={editFields.email ?? lead.email ?? ""}
                                onChange={(e) => handleEditingChange(lead.channelId, "email", e.target.value)}
                                className="w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                                placeholder="Email address"
                              />
                              <input
                                type="url"
                                value={editFields.website ?? lead.website ?? ""}
                                onChange={(e) => handleEditingChange(lead.channelId, "website", e.target.value)}
                                className="w-full min-w-0 px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                                placeholder="Website"
                              />
                            </div>
                          ) : (
                            <div className="min-w-0">
                              {lead.email ? (
                                <>
                                  <p className="truncate font-medium text-blue-700">{lead.email}</p>
                                  <p className="truncate text-xs text-slate-500">{lead.website || "No website"}</p>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(lead.channelId);
                                  }}
                                  className="text-slate-400 hover:text-blue-600 underline hover:no-underline text-sm font-medium"
                                >
                                  + Add email
                                </button>
                              )}
                            </div>
                          )}
                        </Td>
                        <Td sticky="left" left={STICKY_VERIFICATION_LEFT} className="min-w-[160px]">
                          {isEditing ? (
                            <select
                              value={editFields.emailVerificationStatus ?? lead.emailVerificationStatus ?? "not_verified"}
                              onChange={(e) => handleEditingChange(lead.channelId, "emailVerificationStatus", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                            >
                              <option value="not_verified">Not verified</option>
                              <option value="valid">Valid</option>
                              <option value="invalid">Invalid</option>
                              <option value="risky">Risky</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          ) : (
                            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${verificationBadge(lead.emailVerificationStatus)}`}>
                              {(lead.emailVerificationStatus ?? "not_verified").replace("_", " ")}
                            </span>
                          )}
                        </Td>
                        <Td className="min-w-[120px]">
                          {isEditing ? (
                            <select
                              value={editFields.leadScore ?? lead.leadScore}
                              onChange={(e) => handleEditingChange(lead.channelId, "leadScore", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          ) : (
                            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${badgeClasses(lead.leadScore)}`}>
                              {lead.leadScore}
                            </span>
                          )}
                        </Td>
                        <Td className="min-w-[180px]">{formatDate(lead.addedDate)}</Td>
                        <Td className="min-w-[160px]">
                          <span className="truncate text-xs text-slate-500">{lead.searchKeyword || "Current search"}</span>
                        </Td>
                        <Td className="min-w-[120px]">
                          {isEditing ? (
                            <select
                              value={editFields.approvalStatus ?? lead.approvalStatus ?? "pending_review"}
                              onChange={(e) => handleEditingChange(lead.channelId, "approvalStatus", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                            >
                              <option value="pending_review">Pending Review</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          ) : (
                            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${approvalBadge(lead.approvalStatus)}`}>
                              {(lead.approvalStatus ?? "pending_review").replace("_", " ")}
                            </span>
                          )}
                        </Td>
                        <Td className="min-w-[90px]">{formatAge(lead.ageInYears)}</Td>
                        <Td className="min-w-[120px]">
                          {isEditing ? (
                            <select
                              value={editFields.leadStatus ?? lead.leadStatus}
                              onChange={(e) => handleEditingChange(lead.channelId, "leadStatus", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                            >
                              {leadStatuses.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusClasses(lead.leadStatus)}`}>
                              {lead.leadStatus}
                            </span>
                          )}
                        </Td>
                        <Td className="min-w-[90px]">
                          {isEditing ? (
                            <select
                              value={editFields.leadStage ?? lead.leadStage ?? "New"}
                              onChange={(e) => handleEditingChange(lead.channelId, "leadStage", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                            >
                              <option value="New">New</option>
                              <option value="Approved">Approved</option>
                              <option value="Sent">Sent</option>
                              <option value="Opened">Opened</option>
                              <option value="Replied">Replied</option>
                              <option value="Interested">Interested</option>
                              <option value="Meeting Scheduled">Meeting Scheduled</option>
                              <option value="Closed Won">Closed Won</option>
                              <option value="Closed Lost">Closed Lost</option>
                            </select>
                          ) : (
                            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${badgeClasses(lead.leadScore)}`}>
                              {lead.leadScore}
                            </span>
                          )}
                        </Td>
                        <Td className="min-w-[140px]">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEditing(lead.channelId);
                                }}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                                title="Save"
                              >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditing(lead.channelId);
                                }}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(lead.channelId);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                title="Edit"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteLead(lead.channelId);
                                }}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                                title="Delete"
                              >
                                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </button>
                            </div>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                  {paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="px-4 py-10 text-center text-sm text-slate-500">
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
                    {page}
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
              <input value={sheetName} onChange={(e)=>setSheetName(e.target.value)} placeholder="Sheet name e.g. Bihar News Outreach - 27 Aug" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
              <button type="button" onClick={()=>void createSheetFromApproved()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Create Sheet from Approved</button>
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
                  {leadSheets.length===0 ? (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">No sheets yet. Approve some leads and create one.</td></tr>
                  ) : leadSheets.map((s)=> (
                    <tr key={s.id}>
                      <td className="px-3 py-2 font-medium">{s.name}<br/><span className="text-xs text-slate-500">{new Date(s.createdAt ?? s.createdAt).toLocaleDateString()}</span></td>
                      <td className="px-3 py-2">{s.totalLeads}</td>
                      <td className="px-3 py-2">{s.approvedLeads} / {s.rejectedLeads}</td>
                      <td className="px-3 py-2 text-xs">{s.verificationSummary ? `${s.verificationSummary.valid ?? 0} valid, ${s.verificationSummary.invalid ?? 0} invalid` : "-"}</td>
                      <td className="px-3 py-2">
                        <select value={selectedTemplateId} onChange={(e)=>setSelectedTemplateId(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-xs">
                          <option value="">Select template</option>
                          {templates.map((tpl)=><option key={tpl.id} value={String(tpl.id)}>{tpl.name} ({tpl.category})</option>)}
                        </select>
                        <button type="button" onClick={()=>void attachTemplate(s.id)} className="ml-2 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Attach</button>
                        {s.templateName ? <div className="mt-1 text-xs text-emerald-600">{s.templateName}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {s.sendAt ? new Date(s.sendAt).toLocaleString() : <span className="text-slate-400">Not scheduled</span>}
                        <div className="mt-1 flex gap-1">
                          <input type="datetime-local" id={`sendAt-${s.id}`} defaultValue={s.sendAt ? new Date(new Date(s.sendAt).getTime() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16) : ""} className="w-32 rounded border border-slate-200 px-1 py-0.5 text-[10px]" />
                          <button type="button" onClick={async ()=>{
                            const el = document.getElementById(`sendAt-${s.id}`) as HTMLInputElement;
                            const val = el?.value ? new Date(el.value).toISOString() : null;
                            const res = await fetch(`/api/lead-sheets/${s.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sendAt: val })});
                            const data = await res.json().catch(()=>({}));
                            if (!res.ok) alert(data.error || 'Failed');
                            else location.reload();
                          }} className="rounded border border-slate-200 px-1 py-0.5 text-[10px] hover:bg-slate-50">Set</button>
                        </div>
                      </td>
                      <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-xs ${s.status==="scheduled" ? "bg-sky-50 text-sky-700 border-sky-200" : s.status==="ready_for_bulk_mail" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s.status==="sending" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600"}`}>{s.status}</span></td>
                      <td className="px-3 py-2"><button type="button" onClick={()=>void handoffSheet(s.id)} className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500">Handoff</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Bulk Mail handoff is read-only — returns <code>READY_FOR_BULK_MAIL</code> with leadIds/emails/templateId. No SMTP/queue is created here.</p>
          </div>
        </details>
      </main>

      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeAddLeadModal}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Add New Lead</h2>
              <button
                type="button"
                onClick={closeAddLeadModal}
                className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createLead(); }} className="p-6 space-y-4">
              {addLeadError && (
                <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                  {addLeadError}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Channel ID *</label>
                  <input
                    type="text"
                    value={addLeadForm.channelId}
                    onChange={(e) => handleAddLeadChange("channelId", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g., UC_x5XG1OV2P6uZZ5FSM9Ttw"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">YouTube Channel ID (from channel URL)</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Channel Name *</label>
                  <input
                    type="text"
                    value={addLeadForm.channelName}
                    onChange={(e) => handleAddLeadChange("channelName", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Channel name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Channel URL</label>
                  <input
                    type="url"
                    value={addLeadForm.channelUrl}
                    onChange={(e) => handleAddLeadChange("channelUrl", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="https://youtube.com/channel/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={addLeadForm.source}
                    onChange={(e) => handleAddLeadChange("source", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {sourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subscribers</label>
                  <input
                    type="number"
                    value={addLeadForm.subscribers}
                    onChange={(e) => handleAddLeadChange("subscribers", Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Videos</label>
                  <input
                    type="number"
                    value={addLeadForm.videoCount}
                    onChange={(e) => handleAddLeadChange("videoCount", Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Views</label>
                  <input
                    type="number"
                    value={addLeadForm.viewCount}
                    onChange={(e) => handleAddLeadChange("viewCount", Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={addLeadForm.country}
                    onChange={(e) => handleAddLeadChange("country", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g., United States"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Channel Age (years)</label>
                  <input
                    type="number"
                    value={addLeadForm.ageInYears}
                    onChange={(e) => handleAddLeadChange("ageInYears", Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={addLeadForm.email}
                    onChange={(e) => handleAddLeadChange("email", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="contact@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={addLeadForm.website}
                    onChange={(e) => handleAddLeadChange("website", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={addLeadForm.phone}
                    onChange={(e) => handleAddLeadChange("phone", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="+1 555-123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={addLeadForm.instagram}
                    onChange={(e) => handleAddLeadChange("instagram", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Facebook</label>
                  <input
                    type="text"
                    value={addLeadForm.facebook}
                    onChange={(e) => handleAddLeadChange("facebook", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="facebook.com/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telegram</label>
                  <input
                    type="text"
                    value={addLeadForm.telegram}
                    onChange={(e) => handleAddLeadChange("telegram", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lead Score</label>
                  <select
                    value={addLeadForm.leadScore}
                    onChange={(e) => handleAddLeadChange("leadScore", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lead Status</label>
                  <select
                    value={addLeadForm.leadStatus}
                    onChange={(e) => handleAddLeadChange("leadStatus", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {leadStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lead Stage</label>
                  <select
                    value={addLeadForm.leadStage}
                    onChange={(e) => handleAddLeadChange("leadStage", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="New">New</option>
                    <option value="Approved">Approved</option>
                    <option value="Sent">Sent</option>
                    <option value="Opened">Opened</option>
                    <option value="Replied">Replied</option>
                    <option value="Interested">Interested</option>
                    <option value="Meeting Scheduled">Meeting Scheduled</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Closed Lost">Closed Lost</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={addLeadForm.notes}
                    onChange={(e) => handleAddLeadChange("notes", e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Internal notes..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">CRM Notes</label>
                  <textarea
                    value={addLeadForm.crmNotes}
                    onChange={(e) => handleAddLeadChange("crmNotes", e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="CRM-specific notes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lead Owner</label>
                  <input
                    type="text"
                    value={addLeadForm.leadOwner}
                    onChange={(e) => handleAddLeadChange("leadOwner", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Team member name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={addLeadForm.tags}
                    onChange={(e) => handleAddLeadChange("tags", e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={addLeadForm.description}
                    onChange={(e) => handleAddLeadChange("description", e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Channel description..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeAddLeadModal}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingLead}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {isAddingLead ? "Creating..." : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide ${sticky ? "sticky z-20 bg-slate-50" : ""} ${className ?? ""}`}
      style={sticky ? { left } : undefined}
    >
      {children}
    </th>
  );
}

function Td({ children, className, sticky, left = 0 }: { children: ReactNode; className?: string; sticky?: "left"; left?: number }) {
  return (
    <td
      className={`px-4 align-middle ${sticky ? "sticky z-10 bg-white shadow-[1px_0_0_0_rgba(226,232,240,0.9)]" : ""} ${className ?? ""}`}
      style={sticky ? { left } : undefined}
    >
      {children}
    </td>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ContactField({ label, value }: { label: string; value: string }) {
  const text = value || "-";
  const isLink = /^https?:\/\//i.test(text);
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <p className="text-xs text-slate-500">{label}</p>
      {isLink ? (
        <a
          href={text}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block truncate font-medium text-blue-600 hover:text-blue-500"
        >
          {text}
        </a>
      ) : (
        <p className="mt-1 truncate font-medium text-slate-900">{text}</p>
      )}
    </div>
  );
}

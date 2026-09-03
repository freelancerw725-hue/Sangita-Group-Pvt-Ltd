import type { CrmStatus, LeadRecord, ReplyStatus } from "@/lib/types";

export const CRM_SHEET_HEADERS = [
  "Search Keyword",
  "Lead Score",
  "Channel ID",
  "Channel Name",
  "Channel URL",
  "Subscribers",
  "Video Count",
  "View Count",
  "Description",
  "Country",
  "Website",
  "Email",
  "Phone",
  "Instagram",
  "Facebook",
  "Telegram",
  "App Available",
  "Website Available",
  "Lead Status",
  "Notes",
  "Added Date",
  "Last Updated",
  "Verified",
  "Send_Mail",
  "Status",
  "Reply_Status",
  "Sent_Time",
  "Last_Followup_Time",
  "Followup_Count",
  "Thread_ID",
  "Campaign_ID",
  "Demo_Sent",
  "Demo_Sent_Time",
  "Demo_Type",
  "Interested",
  "Meeting_Scheduled",
  "Closed_Won",
  "Closed_Lost",
  "Last_Reply_Time",
  "Last_Email_Subject",
] as const;

const demoKeywords = [
  "app demo",
  "website demo",
  "demo",
  "sample",
  "portfolio",
  "example",
  "show me",
];

function hasText(value: string | undefined | null) {
  return Boolean(value && value.trim());
}

function isValidEmail(value: string | undefined | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function inferCrmStatus(lead: Partial<LeadRecord>): CrmStatus {
  if (lead.closedLost) return "Closed Lost";
  if (lead.closedWon) return "Closed Won";
  if (lead.meetingScheduled) return "Meeting Scheduled";
  if (lead.interested || lead.leadStage === "Interested" || lead.leadStatus === "Interested")
    return "Interested";
  if (lead.demoSent) return "Demo Sent";
  if (lead.leadStatus === "Not Interested") return "Closed Lost";
  if (lead.leadStatus === "Closed") return "Closed Won";
  if (lead.replyStatus && lead.replyStatus !== "No Reply") return "Replied";
  if (lead.lastReplyTime || lead.leadStage === "Replied" || lead.leadStatus === "Replied")
    return "Replied";
  if (
    lead.sentTime ||
    lead.emailSentAt ||
    lead.emailThreadId ||
    lead.threadId ||
    lead.leadStage === "Sent" ||
    lead.leadStatus === "Contacted"
  ) {
    return "Sent";
  }
  if (lead.verified) return "Verified";
  if (lead.approved) return "Approved";
  return "New";
}

function inferReplyStatus(lead: Partial<LeadRecord>): ReplyStatus {
  if (lead.replyStatus) return lead.replyStatus;
  if (lead.demoSent) return "Demo Request";
  if (lead.interested) return "Interested";
  if (lead.closedLost || lead.leadStatus === "Not Interested") return "Not Interested";
  if (lead.closedWon) return "Interested";
  if (lead.meetingScheduled) return "Call Request";
  return "No Reply";
}

export function normalizeLeadRecord(lead: LeadRecord): LeadRecord {
  const approved = lead.approved ?? false;
  const verified = lead.verified ?? approved;
  const sendMail = lead.sendMail ?? approved;
  const status = lead.status ?? inferCrmStatus(lead);
  const replyStatus = inferReplyStatus(lead);

  return {
    ...lead,
    approved,
    verified,
    sendMail,
    status,
    replyStatus,
    sentTime: lead.sentTime ?? lead.emailSentAt,
    lastFollowupTime: lead.lastFollowupTime ?? "",
    followupCount: lead.followupCount ?? 0,
    threadId: lead.threadId ?? lead.emailThreadId ?? "",
    campaignId: lead.campaignId ?? "",
    demoSent: lead.demoSent ?? status === "Demo Sent",
    demoSentTime: lead.demoSentTime ?? "",
    demoType: lead.demoType ?? "",
    interested: lead.interested ?? status === "Interested",
    meetingScheduled: lead.meetingScheduled ?? status === "Meeting Scheduled",
    closedWon: lead.closedWon ?? status === "Closed Won",
    closedLost: lead.closedLost ?? status === "Closed Lost",
    lastReplyTime: lead.lastReplyTime ?? "",
    lastEmailSubject: lead.lastEmailSubject ?? "",
  };
}

export function getCrmSheetRow(lead: LeadRecord): Array<string | number | boolean> {
  const normalized = normalizeLeadRecord(lead);
  return [
    normalized.searchKeyword,
    normalized.leadScore,
    normalized.channelId,
    normalized.channelName,
    normalized.channelUrl,
    normalized.subscribers,
    normalized.videoCount,
    normalized.viewCount,
    normalized.description,
    normalized.country,
    normalized.website,
    normalized.email,
    normalized.phone,
    normalized.instagram,
    normalized.facebook,
    normalized.telegram,
    normalized.appAvailable ? "Yes" : "No",
    normalized.websiteAvailable ? "Yes" : "No",
    normalized.leadStatus,
    normalized.notes,
    normalized.addedDate,
    normalized.lastUpdated,
    normalized.verified ?? false,
    normalized.sendMail ?? false,
    normalized.status ?? "New",
    normalized.replyStatus ?? "No Reply",
    normalized.sentTime ?? "",
    normalized.lastFollowupTime ?? "",
    normalized.followupCount ?? 0,
    normalized.threadId ?? "",
    normalized.campaignId ?? "",
    normalized.demoSent ?? false,
    normalized.demoSentTime ?? "",
    normalized.demoType ?? "",
    normalized.interested ?? false,
    normalized.meetingScheduled ?? false,
    normalized.closedWon ?? false,
    normalized.closedLost ?? false,
    normalized.lastReplyTime ?? "",
    normalized.lastEmailSubject ?? "",
  ];
}

export function getCrmStatusOptions(): CrmStatus[] {
  return [
    "New",
    "Verified",
    "Approved",
    "Sent",
    "Replied",
    "Demo Sent",
    "Interested",
    "Meeting Scheduled",
    "Closed Won",
    "Closed Lost",
  ];
}

export function getReplyStatusOptions(): ReplyStatus[] {
  return [
    "No Reply",
    "Demo Request",
    "Pricing Request",
    "Call Request",
    "Interested",
    "Not Interested",
    "Future Followup",
  ];
}

export function shouldSendLeadEmail(lead: LeadRecord, manualResend = false): boolean {
  const normalized = normalizeLeadRecord(lead);
  if (!isValidEmail(normalized.email)) return false;
  if (!normalized.verified || !normalized.sendMail) return false;
  if (!manualResend) {
    if (
      normalized.status === "Sent" ||
      normalized.status === "Closed Won" ||
      normalized.status === "Closed Lost"
    )
      return false;
    if (normalized.sentTime || normalized.threadId) return false;
  }
  return true;
}

export function isDemoRequestText(text: string) {
  const normalized = normalizeText(text);
  return demoKeywords.some((keyword) => normalized.includes(keyword));
}

export function detectDemoType(text: string): string {
  const normalized = normalizeText(text);
  if (normalized.includes("app demo")) return "App Demo";
  if (normalized.includes("website demo")) return "Website Demo";
  if (normalized.includes("portfolio")) return "Portfolio";
  if (normalized.includes("sample")) return "Sample";
  if (normalized.includes("example")) return "Example";
  return "General Demo";
}

export function extractEmailAddress(value: string): string {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? value.trim();
}

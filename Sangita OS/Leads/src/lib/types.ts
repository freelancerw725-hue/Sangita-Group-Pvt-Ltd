export type LeadSource = "youtube" | "google_maps" | "news" | "real_estate" | "local_business";

export type LeadStatus = "New" | "Contacted" | "Replied" | "Interested" | "Closed" | "Not Interested";

export type LeadScore = "High" | "Medium" | "Low";

export type SortBy = "subscribers" | "views" | "videos";

export type ChannelAgePreset = "any" | "under1" | "oneToThree" | "threeToFive" | "overFive";

export type LeadStage =
  | "New"
  | "Approved"
  | "Sent"
  | "Opened"
  | "Replied"
  | "Interested"
  | "Meeting Scheduled"
  | "Closed Won"
  | "Closed Lost";

export type CrmStatus =
  | "New"
  | "Verified"
  | "Approved"
  | "Sent"
  | "Replied"
  | "Demo Sent"
  | "Interested"
  | "Meeting Scheduled"
  | "Closed Won"
  | "Closed Lost";

export type ReplyStatus =
  | "No Reply"
  | "Demo Request"
  | "Pricing Request"
  | "Call Request"
  | "Interested"
  | "Not Interested"
  | "Future Followup";

export interface LeadFilters {
  keywords: string[];
  minSubscribers?: number;
  maxSubscribers?: number;
  country?: string;
  keywordFilter?: string;
  channelAge?: ChannelAgePreset;
  sortBy?: SortBy;
}

export interface GmailAttachment {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export interface GmailSendPayload {
  leadId: string;
  to: string;
  subject: string;
  html: string;
  threadId?: string;
  attachments?: GmailAttachment[];
}

export type EmailEventType = "sent" | "opened" | "replied" | "failed" | "follow_up";
export type EmailStatus = "sent" | "delivered" | "opened" | "replied" | "failed";

export interface EmailEvent {
  id: string;
  leadId: string;
  eventType: EmailEventType;
  status: EmailStatus;
  messageId: string;
  threadId: string;
  subject: string;
  body: string;
  to: string;
  from: string;
  sentAt: string;
  repliedAt?: string;
  error?: string;
}

export type EmailVerificationStatus = "valid" | "invalid" | "risky" | "unknown" | "not_verified";

export type ApprovalStatus = "approved" | "rejected" | "pending_review";

export interface LeadRecord {
  id: string;
  source: LeadSource;
  searchKeyword: string;
  leadScore: LeadScore;
  channelId: string;
  channelName: string;
  channelUrl: string;
  subscribers: number;
  videoCount: number;
  viewCount: number;
  description: string;
  country: string;
  customUrl: string;
  thumbnail: string;
  publishedAt: string;
  ageInYears: number;
  website: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  telegram: string;
  appAvailable: boolean;
  websiteAvailable: boolean;
  leadStatus: LeadStatus;
  leadStage?: LeadStage;
  approved?: boolean;
  verified?: boolean;
  sendMail?: boolean;
  status?: CrmStatus;
  replyStatus?: ReplyStatus;
  sentTime?: string;
  lastFollowupTime?: string;
  followupCount?: number;
  threadId?: string;
  campaignId?: string;
  demoSent?: boolean;
  demoSentTime?: string;
  demoType?: string;
  interested?: boolean;
  meetingScheduled?: boolean;
  closedWon?: boolean;
  closedLost?: boolean;
  lastReplyTime?: string;
  lastEmailSubject?: string;
  emailSentAt?: string;
  emailThreadId?: string;
  emailHistory?: EmailEvent[];
  leadOwner?: string;
  tags?: string[];
  crmNotes?: string;
  notes: string;
  addedDate: string;
  lastUpdated: string;
  emailVerificationStatus?: EmailVerificationStatus;
  approvalStatus?: ApprovalStatus;
  verifiedAt?: string;
  verificationProvider?: string;
  verificationError?: string | null;
  verificationScore?: number | null;
  approvedAt?: string;
  rejectedAt?: string | null;
}

export interface LeadSheet {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  leadIds: string[];
  totalLeads: number;
  approvedLeads: number;
  rejectedLeads: number;
  verificationSummary: Record<EmailVerificationStatus, number>;
  templateId: number | null;
  templateName: string | null;
  templateCategory: string | null;
  status: "draft" | "ready_for_bulk_mail";
  sendAt?: string;
}

export interface SearchHistoryEntry {
  id: string;
  searchKeyword: string;
  keywords: string[];
  searchedAt: string;
  totalLeadsFound: number;
}

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  contacted: number;
  replied: number;
  highPotential: number;
}

export interface YouTubeChannelCandidate {
  channelId: string;
  channelName: string;
  channelUrl: string;
  subscribers: number;
  videoCount: number;
  viewCount: number;
  description: string;
  country: string;
  customUrl: string;
  thumbnail: string;
  publishedAt: string;
}

export interface SearchResponse {
  leads: LeadRecord[];
  currentSearchLeads: LeadRecord[];
  history: SearchHistoryEntry[];
  historyEntry: SearchHistoryEntry;
  totalFound: number;
  savedCount: number;
  skippedDuplicates: number;
  stats: DashboardStats;
  message: string;
}

export interface SyncResponse {
  appended: number;
  skippedExisting: number;
  sheetName: string;
}

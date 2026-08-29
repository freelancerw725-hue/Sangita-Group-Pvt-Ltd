import { NextResponse } from "next/server";
import { z } from "zod";
import { updateLeadByChannelId, deleteLeadByChannelId } from "@/lib/lead-store";
import { syncLeadToGoogleSheets, removeLeadFromGoogleSheets } from "@/lib/google-sheets";

export const runtime = "nodejs";

const patchSchema = z.object({
  leadStatus: z.enum(["New", "Contacted", "Replied", "Interested", "Closed", "Not Interested"]).optional(),
  notes: z.string().max(5000).optional(),
  approved: z.boolean().optional(),
  verified: z.boolean().optional(),
  sendMail: z.boolean().optional(),
  status: z
    .enum([
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
    ])
    .optional(),
  replyStatus: z
    .enum(["No Reply", "Demo Request", "Pricing Request", "Call Request", "Interested", "Not Interested", "Future Followup"])
    .optional(),
  sentTime: z.string().optional(),
  lastFollowupTime: z.string().optional(),
  followupCount: z.number().int().nonnegative().optional(),
  threadId: z.string().max(500).optional(),
  campaignId: z.string().max(500).optional(),
  demoSent: z.boolean().optional(),
  demoSentTime: z.string().optional(),
  demoType: z.string().max(120).optional(),
  interested: z.boolean().optional(),
  meetingScheduled: z.boolean().optional(),
  closedWon: z.boolean().optional(),
  closedLost: z.boolean().optional(),
  lastReplyTime: z.string().optional(),
  email: z.string().max(500).optional(),
  website: z.string().max(500).optional(),
  phone: z.string().max(200).optional(),
  instagram: z.string().max(500).optional(),
  facebook: z.string().max(500).optional(),
  telegram: z.string().max(500).optional(),
  channelName: z.string().max(500).optional(),
  country: z.string().max(200).optional(),
  source: z.enum(["youtube", "google_maps", "news", "real_estate", "local_business"]).optional(),
  leadScore: z.enum(["High", "Medium", "Low"]).optional(),
  leadStage: z
    .enum([
      "New",
      "Approved",
      "Sent",
      "Opened",
      "Replied",
      "Interested",
      "Meeting Scheduled",
      "Closed Won",
      "Closed Lost",
    ])
    .optional(),
  crmNotes: z.string().max(5000).optional(),
  leadOwner: z.string().max(200).optional(),
  tags: z.array(z.string().max(100)).optional(),
  emailVerificationStatus: z.enum(["valid", "invalid", "risky", "unknown", "not_verified"]).optional(),
  approvalStatus: z.enum(["pending_review", "approved", "rejected"]).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ channelId: string }> }) {
  try {
    const { channelId } = await context.params;
    if (!/^[A-Za-z0-9_-]{3,120}$/.test(channelId)) {
      return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid lead update payload." }, { status: 400 });
    }

    const patch: Partial<import("@/lib/types").LeadRecord> = {};
    const editableFields = [
      "leadStatus", "notes", "approved", "verified", "sendMail", "status", "replyStatus",
      "sentTime", "lastFollowupTime", "followupCount", "threadId", "campaignId",
      "demoSent", "demoSentTime", "demoType", "interested", "meetingScheduled",
      "closedWon", "closedLost", "lastReplyTime",
      "email", "website", "phone", "instagram", "facebook", "telegram",
      "channelName", "country", "source", "leadScore", "leadStage",
      "crmNotes", "leadOwner", "tags", "emailVerificationStatus", "approvalStatus"
    ] as const;

    for (const field of editableFields) {
      const value = parsed.data[field];
      if (value !== undefined) {
        (patch as Record<string, unknown>)[field] = value;
      }
    }

    if (parsed.data.approved !== undefined && parsed.data.verified === undefined) patch.verified = parsed.data.approved;
    if (parsed.data.approved !== undefined && parsed.data.sendMail === undefined) patch.sendMail = parsed.data.approved;

    const lead = await updateLeadByChannelId(channelId, patch);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // Sync to Google Sheets (fire-and-forget, don't block response)
    syncLeadToGoogleSheets(channelId)
      .then(result => {
        if (result.updated) {
          console.log("[lead-update] Synced to Google Sheets:", { channelId, tabName: result.tabName });
        } else if (result.error) {
          console.warn("[lead-update] Google Sheets sync skipped:", { channelId, reason: result.error });
        }
      })
      .catch(err => console.error("[lead-update] Google Sheets sync failed:", { channelId, error: err }));

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("LEAD_UPDATE_ERROR", error);
    return NextResponse.json(
      { error: "Unable to update lead. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ channelId: string }> }) {
  try {
    const { channelId } = await context.params;
    if (!/^[A-Za-z0-9_-]{3,120}$/.test(channelId)) {
      return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
    }

    const deleted = await deleteLeadByChannelId(channelId);
    if (!deleted) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // Sync to Google Sheets (fire-and-forget, don't block response)
    removeLeadFromGoogleSheets(channelId)
      .then(result => {
        if (result.deleted) {
          console.log("[lead-delete] Removed from Google Sheets:", { channelId, tabName: result.tabName });
        } else if (result.error) {
          console.warn("[lead-delete] Google Sheets sync skipped:", { channelId, reason: result.error });
        }
      })
      .catch(err => console.error("[lead-delete] Google Sheets sync failed:", { channelId, error: err }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LEAD_DELETE_ERROR", error);
    return NextResponse.json(
      { error: "Unable to delete lead. Please try again." },
      { status: 500 },
    );
  }
}

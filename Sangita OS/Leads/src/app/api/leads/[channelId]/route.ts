import { NextResponse } from "next/server";
import { z } from "zod";
import { updateLeadByChannelId } from "@/lib/lead-store";

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
  lastEmailSubject: z.string().max(500).optional(),
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

    const patch: Partial<Pick<import("@/lib/types").LeadRecord, "leadStatus" | "notes" | "approved" | "verified" | "sendMail" | "status" | "replyStatus" | "sentTime" | "lastFollowupTime" | "followupCount" | "threadId" | "campaignId" | "demoSent" | "demoSentTime" | "demoType" | "interested" | "meetingScheduled" | "closedWon" | "closedLost" | "lastReplyTime" | "lastEmailSubject">> = {};
    if (parsed.data.leadStatus !== undefined) patch.leadStatus = parsed.data.leadStatus;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;
    if (parsed.data.approved !== undefined) patch.approved = parsed.data.approved;
    if (parsed.data.verified !== undefined) patch.verified = parsed.data.verified;
    if (parsed.data.sendMail !== undefined) patch.sendMail = parsed.data.sendMail;
    if (parsed.data.status !== undefined) patch.status = parsed.data.status;
    if (parsed.data.replyStatus !== undefined) patch.replyStatus = parsed.data.replyStatus;
    if (parsed.data.sentTime !== undefined) patch.sentTime = parsed.data.sentTime;
    if (parsed.data.lastFollowupTime !== undefined) patch.lastFollowupTime = parsed.data.lastFollowupTime;
    if (parsed.data.followupCount !== undefined) patch.followupCount = parsed.data.followupCount;
    if (parsed.data.threadId !== undefined) patch.threadId = parsed.data.threadId;
    if (parsed.data.campaignId !== undefined) patch.campaignId = parsed.data.campaignId;
    if (parsed.data.demoSent !== undefined) patch.demoSent = parsed.data.demoSent;
    if (parsed.data.demoSentTime !== undefined) patch.demoSentTime = parsed.data.demoSentTime;
    if (parsed.data.demoType !== undefined) patch.demoType = parsed.data.demoType;
    if (parsed.data.interested !== undefined) patch.interested = parsed.data.interested;
    if (parsed.data.meetingScheduled !== undefined) patch.meetingScheduled = parsed.data.meetingScheduled;
    if (parsed.data.closedWon !== undefined) patch.closedWon = parsed.data.closedWon;
    if (parsed.data.closedLost !== undefined) patch.closedLost = parsed.data.closedLost;
    if (parsed.data.lastReplyTime !== undefined) patch.lastReplyTime = parsed.data.lastReplyTime;
    if (parsed.data.lastEmailSubject !== undefined) patch.lastEmailSubject = parsed.data.lastEmailSubject;

    if (parsed.data.approved !== undefined && parsed.data.verified === undefined) patch.verified = parsed.data.approved;
    if (parsed.data.approved !== undefined && parsed.data.sendMail === undefined) patch.sendMail = parsed.data.approved;

    const lead = await updateLeadByChannelId(channelId, patch);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (error) {
    console.error("LEAD_UPDATE_ERROR", error);
    return NextResponse.json(
      { error: "Unable to update lead. Please try again." },
      { status: 500 },
    );
  }
}

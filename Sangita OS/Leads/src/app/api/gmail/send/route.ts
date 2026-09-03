import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoredLeads, updateLeadByChannelId } from "@/lib/lead-store";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendGmail } from "@/lib/gmail";
import { generateGeminiEmail } from "@/lib/gemini";
import type { LeadRecord } from "@/lib/types";
import { normalizeLeadRecord, shouldSendLeadEmail } from "@/lib/crm";

export const runtime = "nodejs";

const sendSchema = z.object({
  leadIds: z
    .array(z.string().regex(/^[A-Za-z0-9_-]{3,120}$/))
    .min(1)
    .max(100),
  manualResend: z.boolean().optional(),
});

async function buildDraft(lead: LeadRecord) {
  try {
    const generated = await generateGeminiEmail(lead);
    return {
      subject: generated.subject,
      html: `<div>${generated.body.replace(/\n/g, "<br />")}</div><hr/><div><strong>Lead summary:</strong><br/>${generated.summary.replace(/\n/g, "<br />")}<br/><strong>Analysis:</strong><br/>${generated.analysis.replace(/\n/g, "<br />")}</div>`,
    };
  } catch {
    return {
      subject: `Growth collaboration for ${lead.channelName}`,
      html: `<p>Hi ${lead.channelName},</p><p>I found your channel and think there's a strong opportunity to work together. Your audience of ${lead.subscribers.toLocaleString()} subscribers and focus on ${lead.country || "your niche"} are a great fit for a partnership.</p><p>Would you be open to a quick call to discuss growth and monetization support?</p><p>Best,<br/>SwiftGrowthDigital</p>`,
    };
  }
}

export async function POST(request: Request) {
  try {
    const limitResponse = enforceRateLimit(request);
    if (limitResponse) return limitResponse;

    const body = await request.json().catch(() => ({}));
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid send request." }, { status: 400 });
    }

    const leads = (await getStoredLeads()).map((lead) => normalizeLeadRecord(lead));
    const leadMap = new Map(leads.map((lead) => [lead.channelId, lead]));
    const results: Array<{ leadId: string; success: boolean; error?: string }> = [];

    for (const leadId of parsed.data.leadIds) {
      const lead = leadMap.get(leadId);
      if (!lead) {
        results.push({ leadId, success: false, error: "Lead not found." });
        continue;
      }

      if (!shouldSendLeadEmail(lead, parsed.data.manualResend)) {
        results.push({ leadId, success: false, error: "Lead is not eligible for sending." });
        continue;
      }

      const draft = await buildDraft(lead);
      try {
        const result = await sendGmail({
          leadId: lead.channelId,
          to: lead.email,
          subject: draft.subject,
          html: draft.html,
          threadId: lead.threadId || lead.emailThreadId || undefined,
        });

        const now = new Date().toISOString();
        const campaignId = lead.campaignId || lead.searchKeyword || lead.channelId;

        await updateLeadByChannelId(lead.channelId, {
          leadStatus: "Contacted",
          leadStage: "Sent",
          approved: true,
          verified: true,
          sendMail: true,
          status: "Sent",
          replyStatus: "No Reply",
          sentTime: now,
          followupCount: 0,
          threadId: result.threadId,
          campaignId,
          lastEmailSubject: draft.subject,
          emailSentAt: now,
          emailThreadId: result.threadId,
        });

        results.push({ leadId, success: true });
      } catch (sendError) {
        results.push({
          leadId,
          success: false,
          error: sendError instanceof Error ? sendError.message : "Send failed.",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("GMAIL_SEND_ERROR", error);
    return NextResponse.json({ error: "Email could not be sent." }, { status: 500 });
  }
}

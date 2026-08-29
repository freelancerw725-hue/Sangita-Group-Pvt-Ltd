import { NextResponse } from "next/server";
import { getEmailHistory } from "@/lib/email-store";
import { getEnv } from "@/lib/env";
import { detectDemoType, extractEmailAddress, isDemoRequestText, normalizeLeadRecord } from "@/lib/crm";
import { fetchGmailThread, sendGmail } from "@/lib/gmail";
import { getStoredLeads, updateLeadByChannelId } from "@/lib/lead-store";

export const runtime = "nodejs";

function extractHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function extractMessageText(message: {
  snippet?: string | null;
  payload?: {
    body?: { data?: string | null } | null;
    parts?: Array<{
      body?: { data?: string | null } | null;
      parts?: Array<any> | null;
    }> | null;
  } | null;
}) {
  const walk = (payload: any): string => {
    if (!payload) return "";
    const bodyData = payload.body?.data;
    if (bodyData) {
      try {
        return decodeBase64Url(bodyData);
      } catch {
        return "";
      }
    }

    for (const part of payload.parts ?? []) {
      const text = walk(part);
      if (text.trim()) return text;
    }

    return "";
  };

  return walk(message.payload) || message.snippet || "";
}

function buildDemoReplyBody(leadName: string, demoType: string) {
  const env = getEnv();
  const links = [
    { label: "Demo 1", url: env.DEMO_1_LINK },
    { label: "Demo 2", url: env.DEMO_2_LINK },
    { label: "Portfolio PDF", url: env.PORTFOLIO_PDF_LINK },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url));

  const linksHtml = links.length
    ? `<ul>${links.map((link) => `<li><a href="${link.url}">${link.label}</a></li>`).join("")}</ul>`
    : "<p>Please add the demo links in the CRM environment config.</p>";

  return {
    subject: `Re: ${leadName} demo request`,
    html: [
      `<p>Hi ${leadName},</p>`,
      `<p>Thanks for reaching out about the ${demoType.toLowerCase()}. I’ve included the relevant assets below.</p>`,
      linksHtml,
      "<p>If you want, I can also walk you through the best fit over a quick call.</p>",
      "<p>Best,<br/>SwiftGrowthDigital</p>",
    ].join(""),
  };
}

export async function POST() {
  try {
    const history = await getEmailHistory();
    const sentThreads = history.filter((event) => event.eventType === "sent" && event.threadId);
    const replies: Array<{ leadId: string; threadId: string; replyFrom: string; replyDate: string }> = [];
    const leads = (await getStoredLeads()).map((lead) => normalizeLeadRecord(lead));
    const leadMap = new Map(leads.map((lead) => [lead.channelId, lead]));

    for (const event of sentThreads) {
      try {
        const thread = await fetchGmailThread(event.threadId);
        const messages = thread.messages ?? [];
        const replyMessages = messages.filter((message) => {
          const headers = message.payload?.headers ?? [];
          const from = extractHeader(headers, "From");
          const messageId = extractHeader(headers, "Message-ID");
          return from && !from.includes(getEnv().GMAIL_FROM_ADDRESS) && messageId !== event.messageId;
        });

        if (replyMessages.length > 0) {
          const latestReply = replyMessages[replyMessages.length - 1];
          const headers = latestReply.payload?.headers ?? [];
          const replyFrom = extractHeader(headers, "From");
          const replyDate = extractHeader(headers, "Date") || new Date().toISOString();
          const replyText = extractMessageText(latestReply);
          const lead = leadMap.get(event.leadId);
          const replyStatus = isDemoRequestText(replyText)
            ? "Demo Request"
            : replyText.toLowerCase().includes("pricing")
              ? "Pricing Request"
              : replyText.toLowerCase().includes("call")
                ? "Call Request"
                : replyText.toLowerCase().includes("interested")
                  ? "Interested"
                  : replyText.toLowerCase().includes("not interested")
                    ? "Not Interested"
                    : "Future Followup";
          const status =
            replyStatus === "Interested"
              ? "Interested"
              : replyStatus === "Call Request"
                ? "Meeting Scheduled"
                : replyStatus === "Not Interested"
                  ? "Closed Lost"
                  : "Replied";

          await updateLeadByChannelId(event.leadId, {
            leadStatus: status === "Closed Lost" ? "Not Interested" : status === "Interested" ? "Interested" : "Replied",
            leadStage: status,
            status,
            replyStatus,
            interested: status === "Interested",
            meetingScheduled: status === "Meeting Scheduled",
            closedWon: false,
            closedLost: status === "Closed Lost",
            lastReplyTime: replyDate,
          });

          if (lead && isDemoRequestText(replyText) && !lead.demoSent) {
            const recipient = extractEmailAddress(replyFrom);
            const demoType = detectDemoType(replyText);
            const demoReply = buildDemoReplyBody(lead.channelName, demoType);

            try {
              const result = await sendGmail({
                leadId: lead.channelId,
                to: recipient || lead.email,
                subject: demoReply.subject,
                html: demoReply.html,
                threadId: event.threadId,
              });

              await updateLeadByChannelId(event.leadId, {
                demoSent: true,
                demoSentTime: new Date().toISOString(),
                demoType,
                status: "Demo Sent",
                replyStatus: "Demo Request",
                leadStage: "Sent",
                threadId: result.threadId,
              });
            } catch {
              // Keep the reply sync moving even if the demo response cannot be sent.
            }
          }

          replies.push({ leadId: event.leadId, threadId: event.threadId, replyFrom, replyDate });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ synced: replies.length, replies });
  } catch (error) {
    console.error("GMAIL_REPLY_SYNC_ERROR", error);
    return NextResponse.json({ error: "Unable to sync Gmail replies." }, { status: 500 });
  }
}

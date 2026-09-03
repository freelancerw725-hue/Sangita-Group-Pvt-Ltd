import { google } from "googleapis";
import { getEnv, isGmailEnabled } from "@/lib/env";
import { appendEmailEvent } from "@/lib/email-store";
import { EmailEvent, GmailSendPayload } from "@/lib/types";
import { saveJsonFile, readLeadsFile } from "@/lib/storage";
import { getDbValue, hasDatabaseUrl, setDbValue } from "@/lib/db";

const GMAIL_TOKEN_FILE = "gmail-token.json";
const GMAIL_USER_ID = "me";

function buildOAuthClient() {
  if (!isGmailEnabled()) {
    throw new Error(
      "Gmail OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI.",
    );
  }

  const env = getEnv();
  return new google.auth.OAuth2({
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
  });
}

export function getGmailAuthUrl() {
  const oauth2Client = buildOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
}

async function loadStoredTokens() {
  if (hasDatabaseUrl()) {
    return getDbValue<{ refresh_token?: string; access_token?: string; expiry_date?: number }>(
      GMAIL_TOKEN_FILE,
      {},
    );
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production Gmail token storage.");
  }
  return readLeadsFile<{ refresh_token?: string; access_token?: string; expiry_date?: number }>(
    GMAIL_TOKEN_FILE,
    {},
  );
}

async function storeTokens(tokens: Record<string, unknown>) {
  if (hasDatabaseUrl()) {
    await setDbValue(GMAIL_TOKEN_FILE, tokens);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production Gmail token storage.");
  }
  await saveJsonFile(GMAIL_TOKEN_FILE, tokens as Record<string, string | number>);
}

async function getAuthorizedClient() {
  const oauth2Client = buildOAuthClient();
  const stored = await loadStoredTokens();
  if (stored.access_token) {
    oauth2Client.setCredentials(stored);
  }

  oauth2Client.on("tokens", async (tokens) => {
    await storeTokens(tokens as Record<string, unknown>);
  });

  if (!stored.refresh_token && !stored.access_token) {
    throw new Error("Gmail account is not connected. Visit the connect flow first.");
  }

  return oauth2Client;
}

function createRawMessage({
  from,
  to,
  subject,
  html,
  threadId,
  attachments,
}: GmailSendPayload & { from: string }) {
  const boundary = `swiftgrowth-${Date.now()}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: multipart/mixed; boundary=${boundary}`,
  ];

  const bodyParts = [
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
  ];

  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      bodyParts.push(
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}; name="${attachment.fileName}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${attachment.fileName}"`,
        "",
        attachment.base64Data,
      );
    }
  }

  if (threadId) {
    headers.push(`In-Reply-To: ${threadId}`);
    headers.push(`References: ${threadId}`);
  }

  bodyParts.push(`--${boundary}--`, "");

  const raw = Buffer.from([...headers, "", ...bodyParts].join("\r\n"), "utf8").toString(
    "base64url",
  );
  return raw;
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = buildOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  await storeTokens(tokens as Record<string, string | number>);
  return tokens;
}

export async function sendGmail(payload: GmailSendPayload) {
  const oauth2Client = await getAuthorizedClient();
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const env = getEnv();
  const rawMessage = createRawMessage({
    from: env.GMAIL_FROM_ADDRESS,
    ...payload,
  });

  const response = await gmail.users.messages.send({
    userId: GMAIL_USER_ID,
    requestBody: {
      raw: rawMessage,
      threadId: payload.threadId,
    },
  });

  const messageId = response.data.id ?? "";
  const threadId = response.data.threadId ?? payload.threadId ?? "";
  const sentAt = new Date().toISOString();

  const event: EmailEvent = {
    id: messageId || `email-${Date.now()}`,
    leadId: payload.leadId,
    eventType: "sent",
    subject: payload.subject,
    body: payload.html,
    to: payload.to,
    from: env.GMAIL_FROM_ADDRESS,
    sentAt,
    threadId,
    messageId,
    status: "sent",
  };

  await appendEmailEvent(event);
  return { messageId, threadId };
}

export async function fetchGmailThread(threadId: string) {
  const oauth2Client = await getAuthorizedClient();
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const response = await gmail.users.threads.get({
    userId: GMAIL_USER_ID,
    id: threadId,
    format: "full",
  });
  return response.data;
}

export async function syncRepliesForThread(threadId: string) {
  const oauth2Client = await getAuthorizedClient();
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const response = await gmail.users.threads.get({
    userId: GMAIL_USER_ID,
    id: threadId,
    format: "metadata",
  });
  return response.data;
}

import { EmailEvent } from "@/lib/types";
import { appendDbEmailEvent, getDbEmailHistory, hasDatabaseUrl } from "@/lib/db";
import { readLeadsFile, updateJsonFile } from "@/lib/storage";

const EMAIL_HISTORY_FILE = "email-history.json";

export async function getEmailHistory(): Promise<EmailEvent[]> {
  if (hasDatabaseUrl()) {
    return getDbEmailHistory();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production email history.");
  }
  return readLeadsFile<EmailEvent[]>(EMAIL_HISTORY_FILE, []);
}

export async function appendEmailEvent(event: EmailEvent): Promise<void> {
  if (hasDatabaseUrl()) {
    await appendDbEmailEvent(event);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for production email history.");
  }
  await updateJsonFile<EmailEvent[]>(EMAIL_HISTORY_FILE, async (current) => {
    return [event, ...current].slice(0, 500);
  }, []);
}

export async function getEmailEventsForLead(leadId: string): Promise<EmailEvent[]> {
  const history = await getEmailHistory();
  return history.filter((event) => event.leadId === leadId);
}

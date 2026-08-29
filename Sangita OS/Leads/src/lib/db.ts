import { Pool } from "pg";

import type { EmailEvent, LeadRecord, SearchHistoryEntry } from "@/lib/types";
import { normalizeLeadRecord } from "@/lib/crm";

let pool: Pool | null = null;
let initialized: Promise<void> | null = null;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim());
}

function getConnectionString() {
  return process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || "";
}

function getPool() {
  if (!pool) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      throw new Error("DATABASE_URL or POSTGRES_URL is required for production persistence.");
    }

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 3,
    });
  }

  return pool;
}

async function ensureSchema() {
  if (!initialized) {
    initialized = getPool().query(`
      CREATE TABLE IF NOT EXISTS leads (
        channel_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        lead_status TEXT GENERATED ALWAYS AS (data->>'leadStatus') STORED,
        lead_score TEXT GENERATED ALWAYS AS (data->>'leadScore') STORED,
        country TEXT GENERATED ALWAYS AS (data->>'country') STORED,
        subscribers BIGINT GENERATED ALWAYS AS (((data->>'subscribers')::BIGINT)) STORED,
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (lead_status);
      CREATE INDEX IF NOT EXISTS leads_score_idx ON leads (lead_score);
      CREATE INDEX IF NOT EXISTS leads_country_idx ON leads (country);
      CREATE INDEX IF NOT EXISTS leads_subscribers_idx ON leads (subscribers);
      CREATE INDEX IF NOT EXISTS leads_last_updated_idx ON leads (last_updated);

      CREATE TABLE IF NOT EXISTS search_history (
        id TEXT PRIMARY KEY,
        searched_at TIMESTAMPTZ NOT NULL,
        data JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS search_history_searched_at_idx ON search_history (searched_at DESC);

      CREATE TABLE IF NOT EXISTS email_events (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        thread_id TEXT,
        event_type TEXT,
        sent_at TIMESTAMPTZ,
        data JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS email_events_lead_id_idx ON email_events (lead_id);
      CREATE INDEX IF NOT EXISTS email_events_thread_id_idx ON email_events (thread_id);
      CREATE INDEX IF NOT EXISTS email_events_sent_at_idx ON email_events (sent_at DESC);

      CREATE TABLE IF NOT EXISTS app_kv (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `).then(() => undefined);
  }

  return initialized;
}

export async function getDbLeads(): Promise<LeadRecord[]> {
  await ensureSchema();
  const result = await getPool().query<{ data: LeadRecord }>("SELECT data FROM leads ORDER BY last_updated DESC");
  return result.rows.map((row) => normalizeLeadRecord(row.data));
}

export async function upsertDbLeads(incoming: LeadRecord[]): Promise<{ leads: LeadRecord[]; skippedDuplicates: number }> {
  await ensureSchema();
  const client = await getPool().connect();
  let skippedDuplicates = 0;

  try {
    await client.query("BEGIN");
    for (const lead of incoming.map((item) => normalizeLeadRecord(item))) {
      const result = await client.query(
        `INSERT INTO leads (channel_id, data, last_updated)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (channel_id) DO NOTHING`,
        [lead.channelId, JSON.stringify(lead)],
      );
      if (result.rowCount === 0) skippedDuplicates += 1;
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { leads: await getDbLeads(), skippedDuplicates };
}

export async function updateDbLead(channelId: string, patch: Partial<LeadRecord>): Promise<LeadRecord | null> {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const current = await client.query<{ data: LeadRecord }>("SELECT data FROM leads WHERE channel_id = $1 FOR UPDATE", [channelId]);
    const existing = current.rows[0]?.data;
    if (!existing) {
      await client.query("ROLLBACK");
      return null;
    }

    const filteredPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    const updated = normalizeLeadRecord({
      ...normalizeLeadRecord(existing),
      ...filteredPatch,
      lastUpdated: new Date().toISOString(),
    });

    await client.query("UPDATE leads SET data = $2::jsonb, last_updated = NOW() WHERE channel_id = $1", [
      channelId,
      JSON.stringify(updated),
    ]);
    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getDbSearchHistory(): Promise<SearchHistoryEntry[]> {
  await ensureSchema();
  const result = await getPool().query<{ data: SearchHistoryEntry }>(
    "SELECT data FROM search_history ORDER BY searched_at DESC LIMIT 200",
  );
  return result.rows.map((row) => row.data);
}

export async function appendDbSearchHistory(entry: SearchHistoryEntry): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO search_history (id, searched_at, data)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id) DO UPDATE SET searched_at = EXCLUDED.searched_at, data = EXCLUDED.data`,
    [entry.id, entry.searchedAt, JSON.stringify(entry)],
  );
}

export async function getDbEmailHistory(): Promise<EmailEvent[]> {
  await ensureSchema();
  const result = await getPool().query<{ data: EmailEvent }>("SELECT data FROM email_events ORDER BY sent_at DESC NULLS LAST LIMIT 500");
  return result.rows.map((row) => row.data);
}

export async function appendDbEmailEvent(event: EmailEvent): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO email_events (id, lead_id, thread_id, event_type, sent_at, data)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       lead_id = EXCLUDED.lead_id,
       thread_id = EXCLUDED.thread_id,
       event_type = EXCLUDED.event_type,
       sent_at = EXCLUDED.sent_at,
       data = EXCLUDED.data`,
    [event.id, event.leadId, event.threadId, event.eventType, event.sentAt || null, JSON.stringify(event)],
  );
}

export async function getDbValue<T>(key: string, fallback: T): Promise<T> {
  await ensureSchema();
  const result = await getPool().query<{ value: T }>("SELECT value FROM app_kv WHERE key = $1", [key]);
  return result.rows[0]?.value ?? fallback;
}

export async function setDbValue<T>(key: string, value: T): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO app_kv (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)],
  );
}

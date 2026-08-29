-- Phase 4: Email event tracking, analytics, open/click tracking

-- ============================================================
-- 1. Add tracking columns to emails (ALTER TABLE — safe, no FK issues)
-- ============================================================
ALTER TABLE emails ADD COLUMN tracking_id TEXT;
UPDATE emails SET tracking_id = lower(hex(randomblob(16))) WHERE tracking_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_tracking_id ON emails (tracking_id);

ALTER TABLE emails ADD COLUMN delivered_at TEXT;
ALTER TABLE emails ADD COLUMN opened_at TEXT;
ALTER TABLE emails ADD COLUMN clicked_at TEXT;
ALTER TABLE emails ADD COLUMN replied_at TEXT;

-- ============================================================
-- 2. Recreate email_events with expanded event types
--    (email_events is a leaf table — nothing references it by FK)
-- ============================================================
ALTER TABLE email_events RENAME TO _email_events_old;

CREATE TABLE email_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id    INTEGER NOT NULL REFERENCES emails (id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns (id) ON DELETE CASCADE,
  lead_id     INTEGER REFERENCES leads (id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
    'queued', 'processing', 'sent', 'delivered', 'open', 'click',
    'bounce', 'failed', 'blocked_prevented', 'rejected', 'replied',
    'temporary_failure', 'permanent_failure'
  )),
  meta        TEXT,
  provider_message_id TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO email_events (id, email_id, campaign_id, lead_id, type, meta, occurred_at)
SELECT id, email_id, campaign_id, lead_id, type, meta, occurred_at
FROM _email_events_old;

DROP TABLE _email_events_old;

CREATE INDEX IF NOT EXISTS idx_events_email ON email_events (email_id);
CREATE INDEX IF NOT EXISTS idx_events_campaign ON email_events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON email_events (type);
CREATE INDEX IF NOT EXISTS idx_events_occurred ON email_events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_lead ON email_events (lead_id);

-- ============================================================
-- 3. Click tracking table
-- ============================================================
CREATE TABLE IF NOT EXISTS email_clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id    INTEGER NOT NULL REFERENCES emails (id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns (id) ON DELETE CASCADE,
  lead_id     INTEGER REFERENCES leads (id) ON DELETE CASCADE,
  target_url  TEXT NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  clicked_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clicks_email ON email_clicks (email_id);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON email_clicks (campaign_id);
CREATE INDEX IF NOT EXISTS idx_clicks_lead ON email_clicks (lead_id);

-- ============================================================
-- 4. Tracking secret key for signed opaque tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS tracking_keys (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  secret     TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO tracking_keys (secret)
  SELECT lower(hex(randomblob(32)))
  WHERE NOT EXISTS (SELECT 1 FROM tracking_keys);

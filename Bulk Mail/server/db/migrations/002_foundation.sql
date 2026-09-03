-- Phase 1 foundation: sessions + queue/provider storage + normalized-email indexes

ALTER TABLE leads ADD COLUMN tenant_id INTEGER;
UPDATE leads SET tenant_id = 1 WHERE tenant_id IS NULL;

ALTER TABLE blocked_contacts ADD COLUMN tenant_id INTEGER;
UPDATE blocked_contacts SET tenant_id = 1 WHERE tenant_id IS NULL;

ALTER TABLE emails ADD COLUMN tenant_id INTEGER;
UPDATE emails SET tenant_id = 1 WHERE tenant_id IS NULL;

ALTER TABLE email_queue ADD COLUMN tenant_id INTEGER;
UPDATE email_queue SET tenant_id = 1 WHERE tenant_id IS NULL;

ALTER TABLE campaign_recipients ADD COLUMN tenant_id INTEGER;
UPDATE campaign_recipients SET tenant_id = 1 WHERE tenant_id IS NULL;

ALTER TABLE email_events ADD COLUMN tenant_id INTEGER;
UPDATE email_events SET tenant_id = 1 WHERE tenant_id IS NULL;

ALTER TABLE sender_accounts ADD COLUMN tenant_id INTEGER;
UPDATE sender_accounts SET tenant_id = 1 WHERE tenant_id IS NULL;

ALTER TABLE leads ADD COLUMN normalized_email TEXT;
UPDATE leads SET normalized_email = LOWER(TRIM(email)) WHERE normalized_email IS NULL OR normalized_email = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_normalized_email ON leads (normalized_email);

ALTER TABLE blocked_contacts ADD COLUMN normalized_email TEXT;
UPDATE blocked_contacts SET normalized_email = LOWER(TRIM(email)) WHERE normalized_email IS NULL OR normalized_email = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_normalized_email ON blocked_contacts (normalized_email);

ALTER TABLE replies ADD COLUMN message_id TEXT;
ALTER TABLE replies ADD COLUMN thread_id TEXT;
ALTER TABLE replies ADD COLUMN classification TEXT NOT NULL DEFAULT 'Neutral';

ALTER TABLE emails ADD COLUMN provider_message_id TEXT;
ALTER TABLE emails ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE emails ADD COLUMN last_attempt_at TEXT;
ALTER TABLE emails ADD COLUMN updated_at TEXT;
UPDATE emails SET updated_at = COALESCE(updated_at, created_at, datetime('now')) WHERE updated_at IS NULL;

ALTER TABLE campaign_recipients ADD COLUMN queued_at TEXT;
ALTER TABLE campaign_recipients ADD COLUMN error TEXT;
ALTER TABLE campaign_recipients ADD COLUMN updated_at TEXT;
UPDATE campaign_recipients SET updated_at = COALESCE(updated_at, created_at, datetime('now')) WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS sender_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL,
  password_secret TEXT NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 200,
  hourly_limit INTEGER NOT NULL DEFAULT 50,
  use_tls INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sender_accounts_email ON sender_accounts (email);
CREATE INDEX IF NOT EXISTS idx_sender_accounts_enabled ON sender_accounts (enabled);

CREATE TABLE IF NOT EXISTS email_provider_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_name TEXT NOT NULL DEFAULT 'smtp',
  default_sender_account_id INTEGER REFERENCES sender_accounts (id) ON DELETE SET NULL,
  settings_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id INTEGER NOT NULL REFERENCES emails (id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns (id) ON DELETE CASCADE,
  lead_id INTEGER REFERENCES leads (id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL COLLATE NOCASE,
  sender_account_id INTEGER REFERENCES sender_accounts (id) ON DELETE SET NULL,
  template_id INTEGER REFERENCES templates (id) ON DELETE SET NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled', 'retry')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  error TEXT,
  sent_at TEXT,
  provider_message_id TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_email ON email_queue (email_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue (status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_sender ON email_queue (sender_account_id);

CREATE TABLE IF NOT EXISTS email_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id INTEGER NOT NULL REFERENCES emails (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_attachments_email ON email_attachments (email_id);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

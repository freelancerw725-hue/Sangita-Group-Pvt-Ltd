-- SwiftGrowth Outreach CRM — initial schema (SQLite)
-- Tables are ordered so every FK parent exists before its children.

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'viewer')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE lead_batches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  source     TEXT NOT NULL DEFAULT 'CSV Import' CHECK (source IN ('CSV Import', 'Sheet Sync', 'Manual entry')),
  status     TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('empty', 'ready', 'active', 'archived')),
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL
    CHECK (category IN ('Initial Outreach', 'Followup 1', 'Followup 2', 'Proposal', 'Meeting Reminder')),
  subject    TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL DEFAULT '',
  variables  TEXT NOT NULL DEFAULT '[]', -- JSON array e.g. ["company"]
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_templates_category ON templates (category);

CREATE TABLE campaigns (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  template_id   INTEGER REFERENCES templates (id) ON DELETE SET NULL,
  audience_type TEXT NOT NULL DEFAULT 'manual' CHECK (audience_type IN ('manual', 'batch', 'all')),
  audience_ref  INTEGER REFERENCES lead_batches (id) ON DELETE SET NULL,
  daily_limit   INTEGER NOT NULL DEFAULT 200,
  delay_seconds INTEGER NOT NULL DEFAULT 45,
  scheduled_at  TEXT,
  completed_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_campaigns_status   ON campaigns (status);
CREATE INDEX idx_campaigns_template ON campaigns (template_id);

CREATE TABLE leads (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  company            TEXT NOT NULL,
  contact            TEXT,
  email              TEXT NOT NULL COLLATE NOCASE,
  status             TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'replied', 'interested', 'customer', 'blocked', 'never_contacted')),
  batch_id           INTEGER REFERENCES lead_batches (id) ON DELETE SET NULL,
  campaign_count     INTEGER NOT NULL DEFAULT 0,
  last_campaign_id   INTEGER REFERENCES campaigns (id) ON DELETE SET NULL,
  last_template      TEXT,
  last_subject       TEXT,
  last_email_sent_at TEXT,
  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_leads_email      ON leads (email);
CREATE INDEX idx_leads_status            ON leads (status);
CREATE INDEX idx_leads_batch             ON leads (batch_id);
CREATE INDEX idx_leads_last_sent         ON leads (last_email_sent_at);
CREATE INDEX idx_leads_created           ON leads (created_at);

CREATE TABLE campaign_recipients (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  lead_id     INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'cancelled')),
  sent_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (campaign_id, lead_id)
);
CREATE INDEX idx_recipients_campaign ON campaign_recipients (campaign_id);
CREATE INDEX idx_recipients_lead     ON campaign_recipients (lead_id);
CREATE INDEX idx_recipients_status   ON campaign_recipients (status);

CREATE TABLE emails (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id  INTEGER REFERENCES campaigns (id) ON DELETE SET NULL,
  recipient_id INTEGER REFERENCES campaign_recipients (id) ON DELETE SET NULL,
  lead_id      INTEGER REFERENCES leads (id) ON DELETE SET NULL,
  template_id  INTEGER REFERENCES templates (id) ON DELETE SET NULL,
  from_email   TEXT,
  to_email     TEXT NOT NULL,
  subject      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  error        TEXT,
  scheduled_at TEXT,
  sent_at      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_emails_campaign  ON emails (campaign_id);
CREATE INDEX idx_emails_lead      ON emails (lead_id);
CREATE INDEX idx_emails_status    ON emails (status);
CREATE INDEX idx_emails_sent_at   ON emails (sent_at);
CREATE INDEX idx_emails_scheduled ON emails (scheduled_at);

CREATE TABLE email_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id    INTEGER NOT NULL REFERENCES emails (id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns (id) ON DELETE CASCADE,
  lead_id     INTEGER REFERENCES leads (id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('queued', 'sent', 'delivered', 'open', 'click', 'bounce', 'failed', 'blocked_prevented')),
  meta        TEXT, -- JSON
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_events_email    ON email_events (email_id);
CREATE INDEX idx_events_campaign ON email_events (campaign_id);
CREATE INDEX idx_events_type     ON email_events (type);

CREATE TABLE conversations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id         INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  subject         TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_conversations_lead ON conversations (lead_id);

CREATE TABLE replies (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  lead_id         INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  campaign_id     INTEGER REFERENCES campaigns (id) ON DELETE SET NULL,
  from_name       TEXT,
  from_email      TEXT NOT NULL,
  subject         TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  quote           TEXT,
  sentiment       TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('interested', 'neutral', 'not_interested')),
  received_at     TEXT NOT NULL DEFAULT (datetime('now')),
  read_at         TEXT
);
CREATE INDEX idx_replies_conversation ON replies (conversation_id);
CREATE INDEX idx_replies_lead         ON replies (lead_id);
CREATE INDEX idx_replies_received     ON replies (received_at);
CREATE INDEX idx_replies_sentiment    ON replies (sentiment);

CREATE TABLE followups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id      INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  campaign_id  INTEGER REFERENCES campaigns (id) ON DELETE SET NULL,
  template_id  INTEGER REFERENCES templates (id) ON DELETE SET NULL,
  scheduled_at TEXT NOT NULL,
  sent_at      TEXT,
  status       TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled', 'overdue')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_followups_status    ON followups (status);
CREATE INDEX idx_followups_scheduled ON followups (scheduled_at);
CREATE INDEX idx_followups_lead      ON followups (lead_id);

CREATE TABLE pipeline_stages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT '#3b82f6',
  position   INTEGER NOT NULL DEFAULT 0,
  is_won     INTEGER NOT NULL DEFAULT 0,
  is_lost    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE opportunities (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id    INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  stage_id   INTEGER NOT NULL REFERENCES pipeline_stages (id) ON DELETE CASCADE,
  title      TEXT,
  value      INTEGER NOT NULL DEFAULT 0, -- rupees
  position   INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  closed_at  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_opps_stage  ON opportunities (stage_id);
CREATE INDEX idx_opps_lead   ON opportunities (lead_id);
CREATE INDEX idx_opps_status ON opportunities (status);

CREATE TABLE customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id    INTEGER REFERENCES leads (id) ON DELETE SET NULL,
  company    TEXT NOT NULL,
  contact    TEXT,
  email      TEXT NOT NULL COLLATE NOCASE,
  phone      TEXT,
  deal_value INTEGER NOT NULL DEFAULT 0,
  won_on     TEXT,
  source     TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_customers_email ON customers (email);

CREATE TABLE blocked_contacts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL COLLATE NOCASE,
  company    TEXT,
  reason     TEXT NOT NULL DEFAULT 'Other'
    CHECK (reason IN ('Asked Not To Contact', 'Bounced', 'Spam Complaint', 'Invalid Email', 'Competitor', 'Other')),
  notes      TEXT,
  blocked_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_blocked_email ON blocked_contacts (email);

CREATE TABLE sheet_connections (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  spreadsheet_id  TEXT,
  worksheet_title TEXT NOT NULL DEFAULT 'Sheet1',
  status          TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected')),
  auto_sync       INTEGER NOT NULL DEFAULT 0,
  rows_count      INTEGER NOT NULL DEFAULT 0,
  imported_count  INTEGER NOT NULL DEFAULT 0,
  last_synced_at  TEXT,
  connected_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sync_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL REFERENCES sheet_connections (id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  imported      INTEGER NOT NULL DEFAULT 0,
  skipped       INTEGER NOT NULL DEFAULT 0,
  failed        INTEGER NOT NULL DEFAULT 0,
  message       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sync_connection ON sync_history (connection_id);
CREATE INDEX idx_sync_created    ON sync_history (created_at);

CREATE TABLE activities (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL CHECK (type IN (
    'reply_received', 'contact_blocked', 'campaign_completed', 'sync_imported',
    'lead_created', 'lead_imported', 'email_sent', 'email_failed', 'deal_won'
  )),
  company    TEXT,
  message    TEXT NOT NULL,
  meta       TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_activities_created ON activities (created_at);

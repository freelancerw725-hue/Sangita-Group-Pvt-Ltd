-- Phase 3 campaign execution state and queue linkage

ALTER TABLE campaigns ADD COLUMN sender_account_id INTEGER REFERENCES sender_accounts (id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN run_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE campaigns ADD COLUMN started_at TEXT;
ALTER TABLE campaigns ADD COLUMN paused_at TEXT;
ALTER TABLE campaigns ADD COLUMN cancelled_at TEXT;
ALTER TABLE campaigns ADD COLUMN last_enqueued_at TEXT;
ALTER TABLE campaigns ADD COLUMN last_processed_at TEXT;

ALTER TABLE email_queue ADD COLUMN campaign_recipient_id INTEGER REFERENCES campaign_recipients (id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_recipient ON email_queue (campaign_recipient_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_run_status ON campaigns (run_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_sender_account ON campaigns (sender_account_id);

UPDATE campaigns
SET run_status = CASE
  WHEN status = 'active' THEN 'running'
  WHEN status = 'paused' THEN 'paused'
  WHEN status = 'completed' THEN 'completed'
  ELSE 'draft'
END
WHERE run_status = 'draft' OR run_status IS NULL;

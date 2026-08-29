-- Phase 2 sender account foundation

ALTER TABLE sender_accounts ADD COLUMN security_mode TEXT NOT NULL DEFAULT 'tls';
ALTER TABLE sender_accounts ADD COLUMN last_tested_at TEXT;
ALTER TABLE sender_accounts ADD COLUMN last_test_status TEXT;
ALTER TABLE sender_accounts ADD COLUMN last_test_error TEXT;
ALTER TABLE emails ADD COLUMN sender_account_id INTEGER REFERENCES sender_accounts (id) ON DELETE SET NULL;
UPDATE sender_accounts SET security_mode = CASE WHEN use_tls = 0 THEN 'none' ELSE 'tls' END WHERE security_mode IS NULL OR security_mode = '';
CREATE INDEX IF NOT EXISTS idx_sender_accounts_security_mode ON sender_accounts (security_mode);

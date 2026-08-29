-- Phase 4 Step 1: Lead Finder batch import — idempotency + source tracking
-- No email sending, no queue, no SMTP changes

CREATE TABLE IF NOT EXISTS batch_imports (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id         TEXT NOT NULL UNIQUE,
  sheet_name       TEXT NOT NULL,
  batch_id         INTEGER REFERENCES lead_batches (id) ON DELETE SET NULL,
  template_id      INTEGER REFERENCES templates (id) ON DELETE SET NULL,
  source           TEXT NOT NULL DEFAULT 'lead_finder' CHECK (source IN ('lead_finder')),
  total            INTEGER NOT NULL DEFAULT 0,
  imported         INTEGER NOT NULL DEFAULT 0,
  duplicates       INTEGER NOT NULL DEFAULT 0,
  rejected         INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_batch_imports_sheet_id ON batch_imports (sheet_id);
CREATE INDEX IF NOT EXISTS idx_batch_imports_batch_id ON batch_imports (batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_imports_created ON batch_imports (created_at);

-- Ensure lead_batches can be queried for import source without altering CHECK constraint
-- We keep lead_batches source as 'Manual entry' for imported batches and store lead_finder details in batch_imports
-- Add notes index for faster lookup if needed (no schema change required)

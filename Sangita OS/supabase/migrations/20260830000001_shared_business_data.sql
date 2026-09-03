-- Phase 2: Shared Business Data Tables for Supabase
-- All projects (Sangita OS, Lead Finder, Bulk Mail) share these tables
-- Idempotent: safe to re-run.

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- LEADS / LEAD FINDER TABLES
-- ============================================================

-- leads: Central lead store (shared by Lead Finder, Bulk Mail, Sangita OS)
-- Schema matches existing production: channel_id as PK, data JSONB with generated columns
create table if not exists public.leads (
  channel_id text primary key,
  data jsonb not null,
  lead_status text generated always as (data->>'leadStatus') stored,
  lead_score text generated always as (data->>'leadScore') stored,
  country text generated always as (data->>'country') stored,
  subscribers bigint generated always as (((data->>'subscribers')::bigint)) stored,
  last_updated timestamptz not null default now()
);

-- Indexes on JSONB paths and generated columns
create index if not exists idx_leads_email on public.leads ((data->>'email'));
create index if not exists idx_leads_normalized_email on public.leads ((data->>'normalizedEmail'));
create index if not exists idx_leads_channel_id on public.leads (channel_id);
create index if not exists idx_leads_status on public.leads (lead_status);
create index if not exists idx_leads_score on public.leads (lead_score);
create index if not exists idx_leads_country on public.leads (country);
create index if not exists idx_leads_subscribers on public.leads (subscribers);
create index if not exists idx_leads_last_updated on public.leads (last_updated);
-- Additional JSONB path indexes for common queries
create index if not exists idx_leads_company on public.leads ((data->>'company'));
create index if not exists idx_leads_contact on public.leads ((data->>'contact'));
create index if not exists idx_leads_verification_status on public.leads ((data->>'verificationStatus'));
create index if not exists idx_leads_approval_status on public.leads ((data->>'approvalStatus'));

-- search_history: Lead Finder search history
-- Schema matches existing production: id as TEXT, data JSONB
create table if not exists public.search_history (
  id text primary key,
  searched_at timestamptz not null,
  data jsonb not null
);

create index if not exists idx_search_history_searched_at on public.search_history (searched_at desc);

-- lead_sheets: Approved lead collections for Bulk Mail handoff
create table if not exists public.lead_sheets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lead_channel_ids text[] not null default '{}',
  total_leads integer not null default 0,
  approved_leads integer not null default 0,
  rejected_leads integer not null default 0,
  verification_summary jsonb not null default '{"valid":0,"invalid":0,"risky":0,"unknown":0,"not_verified":0}',
  template_id integer,
  template_name text,
  template_category text,
  status text not null default 'draft' check (status in ('draft','ready_for_bulk_mail','scheduled','sending','completed','cancelled','archived')),
  send_at timestamptz,
  scheduled_campaign_id integer,
  scheduled_batch_id integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_sheets_status on public.lead_sheets (status);
create index if not exists idx_lead_sheets_created on public.lead_sheets (created_at);

-- automation_jobs: Lead Finder automation job tracking
create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique default gen_random_uuid(),
  keyword text not null,
  normalized_keyword text not null,
  filters jsonb,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  leads_found integer not null default 0,
  new_leads integer not null default 0,
  duplicates integer not null default 0,
  total_found integer not null default 0,
  error_message text,
  idempotency_key text not null,
  new_lead_channel_ids text[] not null default '{}'
);

create index if not exists idx_automation_jobs_status on public.automation_jobs (status);
create index if not exists idx_automation_jobs_keyword on public.automation_jobs (normalized_keyword);
create index if not exists idx_automation_jobs_idempotency on public.automation_jobs (idempotency_key);
create index if not exists idx_automation_jobs_created on public.automation_jobs (created_at);

-- verification_jobs: Email verification job tracking
create table if not exists public.verification_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique default gen_random_uuid(),
  lead_channel_ids text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  total integer not null default 0,
  valid integer not null default 0,
  invalid integer not null default 0,
  risky integer not null default 0,
  unknown integer not null default 0,
  error_message text
);

create index if not exists idx_verification_jobs_status on public.verification_jobs (status);
create index if not exists idx_verification_jobs_created on public.verification_jobs (created_at);

-- ============================================================
-- BULK MAIL TABLES
-- ============================================================

-- users: Bulk Mail users (auth)
create table if not exists public.bulk_mail_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text,
  role text not null default 'admin' check (role in ('admin','manager','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bulk_mail_users_email on public.bulk_mail_users (email);

-- lead_batches: Lead batches for Bulk Mail
create table if not exists public.lead_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  source text not null default 'CSV Import' check (source in ('CSV Import','Sheet Sync','Manual entry','lead_finder')),
  status text not null default 'ready' check (status in ('empty','ready','active','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_batches_status on public.lead_batches (status);
create index if not exists idx_lead_batches_source on public.lead_batches (source);

-- templates: Email templates
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Initial Outreach','Followup 1','Followup 2','Proposal','Meeting Reminder')),
  subject text not null default '',
  body text not null default '',
  variables jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_templates_category on public.templates (category);

-- campaigns: Email campaigns
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  template_id uuid references public.templates(id) on delete set null,
  audience_type text not null default 'manual' check (audience_type in ('manual','batch','all')),
  audience_ref uuid references public.lead_batches(id) on delete set null,
  daily_limit integer not null default 200,
  delay_seconds integer not null default 45,
  scheduled_at timestamptz,
  completed_at timestamptz,
  sender_account_id uuid,
  run_status text not null default 'draft',
  started_at timestamptz,
  paused_at timestamptz,
  cancelled_at timestamptz,
  last_enqueued_at timestamptz,
  last_processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_status on public.campaigns (status);
create index if not exists idx_campaigns_run_status on public.campaigns (run_status);
create index if not exists idx_campaigns_template on public.campaigns (template_id);
create index if not exists idx_campaigns_sender on public.campaigns (sender_account_id);
create index if not exists idx_campaigns_audience on public.campaigns (audience_ref);

-- bulk_mail_leads: Leads in Bulk Mail (synced from central leads table)
create table if not exists public.bulk_mail_leads (
  id uuid primary key default gen_random_uuid(),
  lead_channel_id text references public.leads(channel_id) on delete cascade,
  company text not null,
  contact text,
  email text not null,
  normalized_email text not null,
  status text not null default 'new' check (status in ('new','contacted','replied','interested','customer','blocked','never_contacted')),
  batch_id uuid references public.lead_batches(id) on delete set null,
  campaign_count integer not null default 0,
  last_campaign_id uuid references public.campaigns(id) on delete set null,
  last_template text,
  last_subject text,
  last_email_sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_bulk_mail_leads_email on public.bulk_mail_leads (normalized_email);
create index if not exists idx_bulk_mail_leads_status on public.bulk_mail_leads (status);
create index if not exists idx_bulk_mail_leads_batch on public.bulk_mail_leads (batch_id);
create index if not exists idx_bulk_mail_leads_last_sent on public.bulk_mail_leads (last_email_sent_at);
create index if not exists idx_bulk_mail_leads_lead_channel_id on public.bulk_mail_leads (lead_channel_id);

-- campaign_recipients: Campaign recipients
create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.bulk_mail_leads(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped','cancelled')),
  sent_at timestamptz,
  queued_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);

create index if not exists idx_recipients_campaign on public.campaign_recipients (campaign_id);
create index if not exists idx_recipients_lead on public.campaign_recipients (lead_id);
create index if not exists idx_recipients_status on public.campaign_recipients (status);

-- emails: Individual emails
create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  recipient_id uuid references public.campaign_recipients(id) on delete set null,
  lead_id uuid references public.bulk_mail_leads(id) on delete set null,
  template_id uuid references public.templates(id) on delete set null,
  sender_account_id uuid,
  from_email text,
  to_email text not null,
  subject text not null default '',
  body text not null default '',
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','cancelled')),
  error text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  tracking_id text,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  provider_message_id text,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_emails_tracking_id on public.emails (tracking_id);
create index if not exists idx_emails_campaign on public.emails (campaign_id);
create index if not exists idx_emails_lead on public.emails (lead_id);
create index if not exists idx_emails_status on public.emails (status);
create index if not exists idx_emails_sent_at on public.emails (sent_at);
create index if not exists idx_emails_scheduled on public.emails (scheduled_at);

-- email_events: Email event tracking (Leads app)
-- Schema matches Bulk Mail SQLite structure for compatibility
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.bulk_mail_leads(id) on delete cascade,
  type text not null check (type in ('queued','processing','sent','delivered','open','click','bounce','failed','blocked_prevented','rejected','replied','temporary_failure','permanent_failure')),
  meta jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_events_email on public.email_events (email_id);
create index if not exists idx_events_campaign on public.email_events (campaign_id);
create index if not exists idx_events_type on public.email_events (type);
create index if not exists idx_events_occurred on public.email_events (occurred_at);
create index if not exists idx_events_lead on public.email_events (lead_id);

-- bulk_mail_email_events: Email event tracking for Bulk Mail campaigns
-- Separate table to avoid conflicts with Leads app event tracking
create table if not exists public.bulk_mail_email_events (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.bulk_mail_leads(id) on delete cascade,
  type text not null check (type in ('queued','processing','sent','delivered','open','click','bounce','failed','blocked_prevented','rejected','replied','temporary_failure','permanent_failure')),
  meta jsonb,
  provider_message_id text,
  ip_address text,
  user_agent text,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_bulk_mail_events_email on public.bulk_mail_email_events (email_id);
create index if not exists idx_bulk_mail_events_campaign on public.bulk_mail_email_events (campaign_id);
create index if not exists idx_bulk_mail_events_type on public.bulk_mail_email_events (type);
create index if not exists idx_bulk_mail_events_occurred on public.bulk_mail_email_events (occurred_at);
create index if not exists idx_bulk_mail_events_lead on public.bulk_mail_email_events (lead_id);

-- email_clicks: Click tracking
create table if not exists public.email_clicks (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.bulk_mail_leads(id) on delete cascade,
  target_url text not null,
  ip_address text,
  user_agent text,
  clicked_at timestamptz not null default now()
);

create index if not exists idx_clicks_email on public.email_clicks (email_id);
create index if not exists idx_clicks_campaign on public.email_clicks (campaign_id);
create index if not exists idx_clicks_lead on public.email_clicks (lead_id);

-- tracking_keys: Secret keys for tracking
create table if not exists public.tracking_keys (
  id uuid primary key default gen_random_uuid(),
  secret text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- sender_accounts: SMTP sender accounts
create table if not exists public.sender_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  smtp_host text not null,
  smtp_port integer not null default 587,
  username text not null,
  password_secret text not null,
  daily_limit integer not null default 200,
  hourly_limit integer not null default 50,
  security_mode text not null default 'tls' check (security_mode in ('none','tls','ssl')),
  enabled boolean not null default true,
  last_tested_at timestamptz,
  last_test_status text,
  last_test_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_sender_accounts_email on public.sender_accounts (email);
create index if not exists idx_sender_accounts_enabled on public.sender_accounts (enabled);

-- email_provider_settings: Email provider config
create table if not exists public.email_provider_settings (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null default 'smtp',
  default_sender_account_id uuid references public.sender_accounts(id) on delete set null,
  settings_json jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- email_queue: Email sending queue
create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.bulk_mail_leads(id) on delete cascade,
  recipient_email text not null,
  sender_account_id uuid references public.sender_accounts(id) on delete set null,
  template_id uuid references public.templates(id) on delete set null,
  subject text not null default '',
  body text not null default '',
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled','retry')),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  error text,
  sent_at timestamptz,
  provider_message_id text,
  priority integer not null default 0,
  campaign_recipient_id uuid references public.campaign_recipients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_email_queue_email on public.email_queue (email_id);
create unique index if not exists idx_email_queue_recipient on public.email_queue (campaign_recipient_id);
create index if not exists idx_email_queue_status on public.email_queue (status);
create index if not exists idx_email_queue_scheduled on public.email_queue (scheduled_at);
create index if not exists idx_email_queue_sender on public.email_queue (sender_account_id);

-- email_attachments: Email attachments
create table if not exists public.email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  storage_key text not null,
  file_size integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_attachments_email on public.email_attachments (email_id);

-- conversations: Email conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.bulk_mail_leads(id) on delete cascade,
  subject text not null default '',
  status text not null default 'open' check (status in ('open','closed')),
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_lead on public.conversations (lead_id);

-- replies: Email replies
create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid not null references public.bulk_mail_leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  from_name text,
  from_email text not null,
  subject text not null default '',
  body text not null default '',
  quote text,
  sentiment text not null default 'neutral' check (sentiment in ('interested','neutral','not_interested')),
  received_at timestamptz not null default now(),
  read_at timestamptz,
  message_id text,
  thread_id text,
  classification text not null default 'Neutral'
);

create index if not exists idx_replies_conversation on public.replies (conversation_id);
create index if not exists idx_replies_lead on public.replies (lead_id);
create index if not exists idx_replies_received on public.replies (received_at);
create index if not exists idx_replies_sentiment on public.replies (sentiment);

-- followups: Scheduled followups
create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.bulk_mail_leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  template_id uuid references public.templates(id) on delete set null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','sent','cancelled','overdue')),
  created_at timestamptz not null default now()
);

create index if not exists idx_followups_status on public.followups (status);
create index if not exists idx_followups_scheduled on public.followups (scheduled_at);
create index if not exists idx_followups_lead on public.followups (lead_id);

-- pipeline_stages: CRM pipeline stages
create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#3b82f6',
  position integer not null default 0,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);

-- opportunities: CRM opportunities
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.bulk_mail_leads(id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages(id) on delete cascade,
  title text,
  value integer not null default 0,
  position integer not null default 0,
  status text not null default 'open' check (status in ('open','won','lost')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_opps_stage on public.opportunities (stage_id);
create index if not exists idx_opps_lead on public.opportunities (lead_id);
create index if not exists idx_opps_status on public.opportunities (status);

-- customers: Won customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.bulk_mail_leads(id) on delete set null,
  company text not null,
  contact text,
  email text not null,
  phone text,
  deal_value integer not null default 0,
  won_on timestamptz,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_customers_email on public.customers (email);

-- blocked_contacts: Blocked emails
create table if not exists public.blocked_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text not null,
  company text,
  reason text not null default 'Other' check (reason in ('Asked Not To Contact','Bounced','Spam Complaint','Invalid Email','Competitor','Other')),
  notes text,
  blocked_by uuid references public.bulk_mail_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_blocked_email on public.blocked_contacts (normalized_email);

-- sheet_connections: Google Sheets connections
create table if not exists public.sheet_connections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  spreadsheet_id text,
  worksheet_title text not null default 'Sheet1',
  status text not null default 'disconnected' check (status in ('connected','disconnected')),
  auto_sync boolean not null default false,
  rows_count integer not null default 0,
  imported_count integer not null default 0,
  last_synced_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz not null default now()
);

-- sync_history: Sheet sync history
create table if not exists public.sync_history (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.sheet_connections(id) on delete cascade,
  status text not null check (status in ('success','failed')),
  imported integer not null default 0,
  skipped integer not null default 0,
  failed integer not null default 0,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sync_connection on public.sync_history (connection_id);
create index if not exists idx_sync_created on public.sync_history (created_at);

-- batch_imports: Lead Finder batch imports
create table if not exists public.batch_imports (
  id uuid primary key default gen_random_uuid(),
  sheet_id text not null unique,
  sheet_name text not null,
  batch_id uuid references public.lead_batches(id) on delete set null,
  template_id uuid references public.templates(id) on delete set null,
  source text not null default 'lead_finder' check (source in ('lead_finder')),
  total integer not null default 0,
  imported integer not null default 0,
  duplicates integer not null default 0,
  rejected integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_batch_imports_sheet_id on public.batch_imports (sheet_id);
create index if not exists idx_batch_imports_batch_id on public.batch_imports (batch_id);
create index if not exists idx_batch_imports_created on public.batch_imports (created_at);

-- activities: Activity feed
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('reply_received','contact_blocked','campaign_completed','sync_imported','lead_created','lead_imported','email_sent','email_failed','deal_won')),
  company text,
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_created on public.activities (created_at);

-- sessions: User sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash text not null unique,
  user_id uuid not null references public.bulk_mail_users(id) on delete cascade,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user on public.sessions (user_id);
create index if not exists idx_sessions_expires on public.sessions (expires_at);

-- ============================================================
-- SANGITA OS TABLES
-- ============================================================

-- tasks: Tasks/kanban
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  due_date timestamptz,
  project text,
  owner text,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_tasks_priority on public.tasks (priority);
create index if not exists idx_tasks_due on public.tasks (due_date);
create index if not exists idx_tasks_owner on public.tasks (owner);
create index if not exists idx_tasks_project on public.tasks (project);

-- habits: Habit tracking
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  streak integer not null default 0,
  week_log boolean[] not null default '{false,false,false,false,false,false,false}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- invoices: Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client text not null,
  client_email text not null,
  issue_date date not null,
  due_date date not null,
  status text not null default 'Draft' check (status in ('Draft','Sent','Viewed','Paid','Overdue','Cancelled')),
  items jsonb not null default '[]',
  notes text,
  timeline jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_status on public.invoices (status);
create index if not exists idx_invoices_client on public.invoices (client);
create index if not exists idx_invoices_due on public.invoices (due_date);

-- sangita_customers: CRM customers in Sangita OS
create table if not exists public.sangita_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  role text,
  email text not null,
  phone text,
  ltv integer not null default 0,
  deals integer not null default 0,
  tier text,
  last_touch text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- projects: Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team text,
  status text not null default 'On Track' check (status in ('On Track','At Risk','Blocked')),
  progress integer not null default 0,
  due_date date,
  budget integer not null default 0,
  spent integer not null default 0,
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_projects_owner on public.projects (owner);

-- employees: Employees
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  team text,
  status text not null default 'Active' check (status in ('Active','On leave')),
  perf integer,
  tasks integer,
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- products: Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier text,
  price integer,
  mrr integer,
  users integer,
  churn numeric,
  delta numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- agreements: Agreements
create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  counterparty text not null,
  value integer not null default 0,
  status text not null default 'Draft' check (status in ('Draft','In review','Awaiting signature','Signed')),
  updated text,
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agreements_status on public.agreements (status);

-- quotations: Quotations
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  client text not null,
  value integer not null default 0,
  status text not null default 'Draft' check (status in ('Draft','Sent','Accepted','Rejected')),
  validity date,
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quotations_status on public.quotations (status);

-- calls: Call logs
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  contact text not null,
  company text,
  direction text not null check (direction in ('in','out')),
  duration text,
  outcome text,
  at timestamptz not null default now()
);

create index if not exists idx_calls_at on public.calls (at desc);
create index if not exists idx_calls_contact on public.calls (contact);

-- meetings: Meetings
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  attendees text[],
  at timestamptz not null,
  duration text,
  type text not null check (type in ('Internal','External')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meetings_at on public.meetings (at);

-- notifications: Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  icon text,
  title text not null,
  detail text,
  time text,
  unread boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_unread on public.notifications (unread);
create index if not exists idx_notifications_created on public.notifications (created_at);

-- email_campaigns: Email campaigns (Sangita OS view)
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sent integer not null default 0,
  open_rate numeric,
  click_rate numeric,
  replies integer not null default 0,
  revenue integer not null default 0,
  status text not null default 'Scheduled' check (status in ('Scheduled','Sending','Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- whatsapp_templates: WhatsApp templates
create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  uses integer not null default 0,
  cvr integer,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- activity_feed: Activity feed
create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  who text,
  type text,
  text text not null,
  at text,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_feed_created on public.activity_feed (created_at);

-- habit_log: Habit log
create table if not exists public.habit_log (
  id uuid primary key default gen_random_uuid(),
  habit text not null,
  streak integer not null default 0,
  week_log boolean[] not null default '{false,false,false,false,false,false,false}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cash_flow: Cash flow
create table if not exists public.cash_flow (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  inflow integer not null default 0,
  outflow integer not null default 0,
  created_at timestamptz not null default now()
);

-- expense_breakdown: Expense breakdown
create table if not exists public.expense_breakdown (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  value integer not null default 0,
  created_at timestamptz not null default now()
);

-- forecast_12m: 12-month forecast
create table if not exists public.forecast_12m (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  revenue integer not null default 0,
  profit integer not null default 0,
  best integer not null default 0,
  worst integer not null default 0,
  created_at timestamptz not null default now()
);

-- ai_recs: AI recommendations
create table if not exists public.ai_recs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  impact text,
  confidence integer,
  why text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- risks: Risks
create table if not exists public.risks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  severity text not null check (severity in ('High','Medium','Low')),
  detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- missed_opps: Missed opportunities
create table if not exists public.missed_opps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cost integer not null default 0,
  why text,
  action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- churn_risk: Churn risk
create table if not exists public.churn_risk (
  id uuid primary key default gen_random_uuid(),
  client text not null,
  product text,
  risk integer not null default 0,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- heatmap: Activity heatmap
create table if not exists public.heatmap (
  id uuid primary key default gen_random_uuid(),
  day integer not null,
  hour integer not null,
  value integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_heatmap_day_hour on public.heatmap (day, hour);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on all tables
alter table public.leads enable row level security;
alter table public.search_history enable row level security;
alter table public.lead_sheets enable row level security;
alter table public.automation_jobs enable row level security;
alter table public.verification_jobs enable row level security;
alter table public.bulk_mail_users enable row level security;
alter table public.lead_batches enable row level security;
alter table public.templates enable row level security;
alter table public.campaigns enable row level security;
alter table public.bulk_mail_leads enable row level security;
alter table public.campaign_recipients enable row level security;
alter table public.emails enable row level security;
alter table public.email_events enable row level security;
alter table public.bulk_mail_email_events enable row level security;
alter table public.email_clicks enable row level security;
alter table public.tracking_keys enable row level security;
alter table public.sender_accounts enable row level security;
alter table public.email_provider_settings enable row level security;
alter table public.email_queue enable row level security;
alter table public.email_attachments enable row level security;
alter table public.conversations enable row level security;
alter table public.replies enable row level security;
alter table public.followups enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.opportunities enable row level security;
alter table public.customers enable row level security;
alter table public.blocked_contacts enable row level security;
alter table public.sheet_connections enable row level security;
alter table public.sync_history enable row level security;
alter table public.batch_imports enable row level security;
alter table public.activities enable row level security;
alter table public.sessions enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.invoices enable row level security;
alter table public.sangita_customers enable row level security;
alter table public.projects enable row level security;
alter table public.employees enable row level security;
alter table public.products enable row level security;
alter table public.agreements enable row level security;
alter table public.quotations enable row level security;
alter table public.calls enable row level security;
alter table public.meetings enable row level security;
alter table public.notifications enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.activity_feed enable row level security;
alter table public.habit_log enable row level security;
alter table public.cash_flow enable row level security;
alter table public.expense_breakdown enable row level security;
alter table public.forecast_12m enable row level security;
alter table public.ai_recs enable row level security;
alter table public.risks enable row level security;
alter table public.missed_opps enable row level security;
alter table public.churn_risk enable row level security;
alter table public.heatmap enable row level security;

-- Service role bypasses RLS. Add permissive policies for anon/authenticated
-- so local dev without strict auth still works; tighten later if needed.
do $$
declare
  tbl text;
  tables text[] := array[
    'leads','search_history','lead_sheets','automation_jobs','verification_jobs',
    'bulk_mail_users','lead_batches','templates','campaigns','bulk_mail_leads',
    'campaign_recipients','emails','bulk_mail_email_events','email_clicks','tracking_keys',
    'sender_accounts','email_provider_settings','email_queue','email_attachments',
    'conversations','replies','followups','pipeline_stages','opportunities',
    'customers','blocked_contacts','sheet_connections','sync_history',
    'batch_imports','activities','sessions','tasks','habits','invoices',
    'sangita_customers','projects','employees','products','agreements',
    'quotations','calls','meetings','notifications','email_campaigns',
    'whatsapp_templates','activity_feed','habit_log','cash_flow',
    'expense_breakdown','forecast_12m','ai_recs','risks','missed_opps',
    'churn_risk','heatmap'
  ];
begin
  foreach tbl in array tables
  loop
    -- Service role full access
    if not exists (
      select 1 from pg_policies 
      where schemaname = 'public' 
        and tablename = tbl 
        and policyname = 'Allow all for service role - ' || tbl
    ) then
      execute format('
        create policy %I
          on public.%I for all
          to service_role
          using (true) with check (true)',
        'Allow all for service role - ' || tbl,
        tbl
      );
    end if;

    -- Authenticated CRUD
    if not exists (
      select 1 from pg_policies 
      where schemaname = 'public' 
        and tablename = tbl 
        and policyname = 'Allow authenticated CRUD ' || tbl
    ) then
      execute format('
        create policy %I
          on public.%I for all
          to authenticated
          using (true) with check (true)',
        'Allow authenticated CRUD ' || tbl,
        tbl
      );
    end if;

    -- Anon read
    if not exists (
      select 1 from pg_policies 
      where schemaname = 'public' 
        and tablename = tbl 
        and policyname = 'Allow anon read ' || tbl
    ) then
      execute format('
        create policy %I
          on public.%I for select
          to anon
          using (true)',
        'Allow anon read ' || tbl,
        tbl
      );
    end if;
  end loop;
end $$;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers (only for tables that have updated_at column)
create trigger trg_lead_sheets_updated before update on public.lead_sheets for each row execute function public.update_updated_at_column();
create trigger trg_automation_jobs_updated before update on public.automation_jobs for each row execute function public.update_updated_at_column();
create trigger trg_verification_jobs_updated before update on public.verification_jobs for each row execute function public.update_updated_at_column();
create trigger trg_bulk_mail_users_updated before update on public.bulk_mail_users for each row execute function public.update_updated_at_column();
create trigger trg_lead_batches_updated before update on public.lead_batches for each row execute function public.update_updated_at_column();
create trigger trg_templates_updated before update on public.templates for each row execute function public.update_updated_at_column();
create trigger trg_campaigns_updated before update on public.campaigns for each row execute function public.update_updated_at_column();
create trigger trg_bulk_mail_leads_updated before update on public.bulk_mail_leads for each row execute function public.update_updated_at_column();
create trigger trg_campaign_recipients_updated before update on public.campaign_recipients for each row execute function public.update_updated_at_column();
create trigger trg_emails_updated before update on public.emails for each row execute function public.update_updated_at_column();
create trigger trg_sender_accounts_updated before update on public.sender_accounts for each row execute function public.update_updated_at_column();
create trigger trg_email_provider_settings_updated before update on public.email_provider_settings for each row execute function public.update_updated_at_column();
create trigger trg_email_queue_updated before update on public.email_queue for each row execute function public.update_updated_at_column();
create trigger trg_conversations_updated before update on public.conversations for each row execute function public.update_updated_at_column();
create trigger trg_followups_updated before update on public.followups for each row execute function public.update_updated_at_column();
create trigger trg_opportunities_updated before update on public.opportunities for each row execute function public.update_updated_at_column();
create trigger trg_customers_updated before update on public.customers for each row execute function public.update_updated_at_column();
create trigger trg_sheet_connections_updated before update on public.sheet_connections for each row execute function public.update_updated_at_column();
create trigger trg_batch_imports_updated before update on public.batch_imports for each row execute function public.update_updated_at_column();
create trigger trg_tasks_updated before update on public.tasks for each row execute function public.update_updated_at_column();
create trigger trg_habits_updated before update on public.habits for each row execute function public.update_updated_at_column();
create trigger trg_invoices_updated before update on public.invoices for each row execute function public.update_updated_at_column();
create trigger trg_sangita_customers_updated before update on public.sangita_customers for each row execute function public.update_updated_at_column();
create trigger trg_projects_updated before update on public.projects for each row execute function public.update_updated_at_column();
create trigger trg_employees_updated before update on public.employees for each row execute function public.update_updated_at_column();
create trigger trg_products_updated before update on public.products for each row execute function public.update_updated_at_column();
create trigger trg_agreements_updated before update on public.agreements for each row execute function public.update_updated_at_column();
create trigger trg_quotations_updated before update on public.quotations for each row execute function public.update_updated_at_column();
create trigger trg_meetings_updated before update on public.meetings for each row execute function public.update_updated_at_column();
create trigger trg_notifications_updated before update on public.notifications for each row execute function public.update_updated_at_column();
create trigger trg_email_campaigns_updated before update on public.email_campaigns for each row execute function public.update_updated_at_column();
create trigger trg_whatsapp_templates_updated before update on public.whatsapp_templates for each row execute function public.update_updated_at_column();
create trigger trg_ai_recs_updated before update on public.ai_recs for each row execute function public.update_updated_at_column();
create trigger trg_risks_updated before update on public.risks for each row execute function public.update_updated_at_column();
create trigger trg_missed_opps_updated before update on public.missed_opps for each row execute function public.update_updated_at_column();
create trigger trg_churn_risk_updated before update on public.churn_risk for each row execute function public.update_updated_at_column();
create trigger trg_replies_updated before update on public.replies for each row execute function public.update_updated_at_column();

-- Comments
comment on table public.leads is 'Central lead store shared by Lead Finder, Bulk Mail, and Sangita OS';
comment on table public.search_history is 'Lead Finder search history';
comment on table public.lead_sheets is 'Approved lead collections for Bulk Mail handoff';
comment on table public.automation_jobs is 'Lead Finder automation job tracking';
comment on table public.verification_jobs is 'Email verification job tracking';
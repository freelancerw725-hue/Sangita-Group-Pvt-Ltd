-- Phase 1: Sangita OS Keyword Pool (central source for Lead Finder)
-- Provides keyword_pool + keyword_usage_log with indexes required for automation
-- Idempotent: safe to re-run.

-- Extensions for UUID
create extension if not exists "pgcrypto";

-- keyword_pool: central pool for AI + manual keywords
create table if not exists public.keyword_pool (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  normalized_keyword text not null unique,
  source text not null check (source in ('ai','manual')),
  status text not null default 'active' check (status in ('active','paused','completed')),
  daily_target integer not null default 100 check (daily_target > 0 and daily_target <= 10000),
  priority integer not null default 5 check (priority >= 1 and priority <= 10),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  total_searches integer not null default 0 check (total_searches >= 0),
  total_leads_found integer not null default 0 check (total_leads_found >= 0),
  total_new_leads integer not null default 0 check (total_new_leads >= 0),
  total_duplicates integer not null default 0 check (total_duplicates >= 0),
  notes text,
  constraint keyword_not_empty check (char_length(trim(keyword)) > 0)
);

-- keyword_usage_log: every search attempt by Lead Finder / n8n
create table if not exists public.keyword_usage_log (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.keyword_pool(id) on delete cascade,
  keyword text not null,
  event_type text not null check (event_type in ('search_started','search_completed','failed_search')),
  leads_found integer not null default 0 check (leads_found >= 0),
  new_leads integer not null default 0 check (new_leads >= 0),
  duplicates integer not null default 0 check (duplicates >= 0),
  error_message text,
  created_at timestamptz not null default now()
);

-- Indexes for keyword_pool (required)
create index if not exists idx_keyword_pool_normalized on public.keyword_pool (normalized_keyword);
create index if not exists idx_keyword_pool_status on public.keyword_pool (status);
create index if not exists idx_keyword_pool_priority on public.keyword_pool (priority);
create index if not exists idx_keyword_pool_last_used on public.keyword_pool (last_used_at);
create index if not exists idx_keyword_pool_created_at on public.keyword_pool (created_at);
-- composite index for next-keyword selection (active + priority + last_used_at)
create index if not exists idx_keyword_pool_next_selection on public.keyword_pool (status, priority asc, last_used_at asc nulls first, created_at asc);

-- Indexes for usage log (required for daily target calculation)
create index if not exists idx_keyword_usage_keyword_id on public.keyword_usage_log (keyword_id);
create index if not exists idx_keyword_usage_created_at on public.keyword_usage_log (created_at);
create index if not exists idx_keyword_usage_keyword_created on public.keyword_usage_log (keyword_id, created_at desc);
create index if not exists idx_keyword_usage_keyword_date on public.keyword_usage_log (keyword_id, created_at);

-- RLS: disabled for service_role access; enable but allow service_role bypass
-- For Lovable Cloud / Supabase: keep RLS enabled and add policies for authenticated + service_role.
alter table public.keyword_pool enable row level security;
alter table public.keyword_usage_log enable row level security;

-- Service role bypasses RLS anyway. Add permissive policies for anon/authenticated
-- so local dev without strict auth still works; tighten later if needed.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role - keyword_pool') then
    create policy "Allow all for service role - keyword_pool"
      on public.keyword_pool for all
      to service_role
      using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow authenticated CRUD keyword_pool') then
    create policy "Allow authenticated CRUD keyword_pool"
      on public.keyword_pool for all
      to authenticated
      using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow anon read keyword_pool') then
    create policy "Allow anon read keyword_pool"
      on public.keyword_pool for select
      to anon
      using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role - keyword_usage_log') then
    create policy "Allow all for service role - keyword_usage_log"
      on public.keyword_usage_log for all
      to service_role
      using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow authenticated CRUD keyword_usage_log') then
    create policy "Allow authenticated CRUD keyword_usage_log"
      on public.keyword_usage_log for all
      to authenticated
      using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow anon read keyword_usage_log') then
    create policy "Allow anon read keyword_usage_log"
      on public.keyword_usage_log for select
      to anon
      using (true);
  end if;
exception when duplicate_object then null;
end $$;

-- Helper function: normalize keyword (trim, lower, collapse whitespace)
create or replace function public.normalize_keyword(input text)
returns text
language sql immutable as $$
  select regexp_replace(lower(trim(input)), '\s+', ' ', 'g')
$$;

-- Trigger to keep normalized_keyword in sync (defense-in-depth)
create or replace function public.keyword_pool_normalize_trigger()
returns trigger language plpgsql as $$
begin
  new.normalized_keyword := public.normalize_keyword(new.keyword);
  return new;
end;
$$;

drop trigger if exists trg_keyword_pool_normalize on public.keyword_pool;
create trigger trg_keyword_pool_normalize
  before insert or update of keyword on public.keyword_pool
  for each row execute function public.keyword_pool_normalize_trigger();

-- Function to get today's search count for a keyword (UTC date)
create or replace function public.keyword_today_searches(kid uuid, day date default current_date)
returns integer
language sql stable as $$
  select count(*)::int
  from public.keyword_usage_log
  where keyword_id = kid
    and event_type in ('search_started','search_completed')
    and created_at >= day::timestamptz
    and created_at < (day + 1)::timestamptz
$$;

comment on table public.keyword_pool is 'Phase 1: Central Keyword Pool for Lead Finder automation — stores both AI and manual keywords with daily targets and usage counters.';
comment on table public.keyword_usage_log is 'Phase 1: Per-search usage log for daily target enforcement and n8n automation tracking.';

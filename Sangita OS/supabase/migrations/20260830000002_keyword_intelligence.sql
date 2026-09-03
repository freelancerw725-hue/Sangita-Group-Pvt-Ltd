-- Phase 3: Keyword Intelligence Engine for Sangita Core
-- Deterministic daily keyword selection, region rotation, performance tracking
-- Idempotent: safe to re-run.

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- REGION ROTATION CONFIGURATION
-- ============================================================

-- region_rotation: Configurable ordered list of states/regions to rotate through daily
create table if not exists public.region_rotation (
  id uuid primary key default gen_random_uuid(),
  region_code text not null unique,           -- e.g., 'BR', 'UP', 'MH', 'DL', 'KA'
  region_name text not null,                   -- e.g., 'Bihar', 'Uttar Pradesh', 'Maharashtra'
  display_order integer not null default 0,    -- Rotation priority (lower = earlier in cycle)
  is_active boolean not null default true,
  -- Keyword generation config per region
  keyword_templates jsonb not null default '[]'::jsonb,  -- Array of template patterns
  business_categories jsonb not null default '[]'::jsonb, -- Target business types
  city_modifiers jsonb not null default '[]'::jsonb,      -- Major cities to append
  language_modifiers jsonb not null default '[]'::jsonb,  -- Language variations
  -- Daily limits
  max_keywords_per_day integer not null default 20 check (max_keywords_per_day > 0 and max_keywords_per_day <= 100),
  min_keywords_per_day integer not null default 5 check (min_keywords_per_day > 0),
  -- Performance tuning
  performance_weight numeric not null default 1.0 check (performance_weight > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_region_rotation_active on public.region_rotation (is_active, display_order);
create index if not exists idx_region_rotation_code on public.region_rotation (region_code);

-- ============================================================
-- KEYWORD PERFORMANCE ANALYTICS
-- ============================================================

-- keyword_performance: Aggregated performance metrics per keyword (updated daily via cron)
create table if not exists public.keyword_performance (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.keyword_pool(id) on delete cascade,
  keyword text not null,
  normalized_keyword text not null,
  region_code text,                           -- Region this performance is attributed to
  -- Rolling window metrics (updated daily)
  window_start date not null,                 -- Start of analysis window
  window_end date not null,                   -- End of analysis window (inclusive)
  total_searches integer not null default 0,
  total_leads_found integer not null default 0,
  total_new_leads integer not null default 0,
  total_duplicates integer not null default 0,
  total_verified_valid integer not null default 0,
  total_approved integer not null default 0,
  total_contacted integer not null default 0,
  total_replied integer not null default 0,
  total_interested integer not null default 0,
  total_customers integer not null default 0,
  -- Derived rates
  lead_rate numeric,                          -- total_leads_found / total_searches
  new_lead_rate numeric,                      -- total_new_leads / total_searches
  verification_rate numeric,                  -- total_verified_valid / total_new_leads
  approval_rate numeric,                      -- total_approved / total_verified_valid
  reply_rate numeric,                         -- total_replied / total_contacted
  conversion_rate numeric,                    -- total_customers / total_new_leads
  -- Composite score (0-100) for prioritization
  performance_score numeric not null default 0 check (performance_score >= 0 and performance_score <= 100),
  -- Rank within region (1 = best)
  region_rank integer,
  last_calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (keyword_id, window_start, window_end)
);

create index if not exists idx_keyword_perf_keyword on public.keyword_performance (keyword_id);
create index if not exists idx_keyword_perf_region on public.keyword_performance (region_code);
create index if not exists idx_keyword_perf_window on public.keyword_performance (window_start, window_end);
create index if not exists idx_keyword_perf_score on public.keyword_performance (performance_score desc);
create index if not exists idx_keyword_perf_rank on public.keyword_performance (region_code, region_rank);

-- ============================================================
-- DAILY KEYWORD RUNS / EXECUTION LOG
-- ============================================================

-- daily_keyword_runs: Record of each day's keyword selection and execution
create table if not exists public.daily_keyword_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null unique,              -- The date this run is for (UTC)
  region_code text not null references public.region_rotation(region_code),
  region_name text not null,
  status text not null default 'pending' check (status in ('pending','running','completed','failed','partial')),
  -- Configuration snapshot
  config_snapshot jsonb not null default '{}'::jsonb,
  -- Selected keywords for this run
  selected_keywords jsonb not null default '[]'::jsonb,  -- Array of {id, keyword, source, priority, dailyTarget, reason}
  -- Execution results
  total_keywords_selected integer not null default 0,
  total_searches_initiated integer not null default 0,
  total_searches_completed integer not null default 0,
  total_leads_found integer not null default 0,
  total_new_leads integer not null default 0,
  total_duplicates integer not null default 0,
  -- Lead Finder job tracking
  lead_finder_job_ids uuid[] not null default '{}',
  -- Error tracking
  error_message text,
  error_details jsonb,
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_daily_runs_date on public.daily_keyword_runs (run_date desc);
create index if not exists idx_daily_runs_region on public.daily_keyword_runs (region_code);
create index if not exists idx_daily_runs_status on public.daily_keyword_runs (status);

-- ============================================================
-- DAILY KEYWORD SELECTION LOG (per-keyword detail)
-- ============================================================

-- daily_keyword_selections: Individual keyword selection details per daily run
create table if not exists public.daily_keyword_selections (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.daily_keyword_runs(id) on delete cascade,
  keyword_id uuid not null references public.keyword_pool(id) on delete cascade,
  keyword text not null,
  normalized_keyword text not null,
  source text not null check (source in ('ai','manual','generated')),
  priority integer not null,
  daily_target integer not null,
  selection_reason text not null,             -- Why this keyword was chosen
  performance_score numeric,                  -- Score at time of selection
  region_rank integer,                        -- Rank at time of selection
  -- Execution tracking
  search_initiated boolean not null default false,
  search_completed boolean not null default false,
  leads_found integer not null default 0,
  new_leads integer not null default 0,
  duplicates integer not null default 0,
  lead_finder_job_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_daily_sel_run on public.daily_keyword_selections (run_id);
create index if not exists idx_daily_sel_keyword on public.daily_keyword_selections (keyword_id);
create index if not exists idx_daily_sel_date on public.daily_keyword_selections (created_at);

-- ============================================================
-- KEYWORD GENERATION TEMPLATES (for deterministic generation)
-- ============================================================

-- keyword_templates: Reusable templates for generating region-specific keywords
create table if not exists public.keyword_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  region_code text references public.region_rotation(region_code) on delete set null, -- null = global template
  -- Template structure
  base_patterns jsonb not null default '[]'::jsonb,      -- e.g., ["{region} News", "{region} {category}"]
  category_modifiers jsonb not null default '[]'::jsonb, -- e.g., ["Business", "Politics", "Sports"]
  city_modifiers jsonb not null default '[]'::jsonb,     -- e.g., ["Patna", "Gaya", "Muzaffarpur"]
  language_modifiers jsonb not null default '[]'::jsonb, -- e.g., ["हिंदी", "English", "Urdu"]
  suffixes jsonb not null default '[]'::jsonb,           -- e.g., ["Live", "Updates", "Today", "Breaking"]
  -- Generation config
  max_combinations_per_run integer not null default 50 check (max_combinations_per_run > 0),
  priority integer not null default 5 check (priority >= 1 and priority <= 10),
  source_tag text not null default 'generated',          -- Tag for generated keywords
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_keyword_templates_region on public.keyword_templates (region_code, is_active);
create index if not exists idx_keyword_templates_active on public.keyword_templates (is_active);

-- ============================================================
-- KEYWORD INTELLIGENCE CONFIGURATION
-- ============================================================

-- keyword_intelligence_config: Global settings for the intelligence engine
create table if not exists public.keyword_intelligence_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  config_value jsonb not null,
  description text,
  is_editable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Default configuration values
insert into public.keyword_intelligence_config (config_key, config_value, description, is_editable) values
  ('rotation_mode', '"sequential"', 'Rotation mode: "sequential" (round-robin), "performance" (best region first), "manual" (fixed region)', true),
  ('fixed_region_code', 'null', 'Fixed region when rotation_mode is "manual"', true),
  ('analysis_window_days', '30', 'Rolling window in days for performance calculation', true),
  ('min_performance_score', '10', 'Minimum performance score to consider a keyword "good"', true),
  ('performance_score_weights', '{"lead_rate": 0.25, "new_lead_rate": 0.25, "verification_rate": 0.15, "approval_rate": 0.15, "reply_rate": 0.1, "conversion_rate": 0.1}', 'Weights for composite performance score calculation', true),
  ('duplication_avoidance_days', '14', 'Days to look back for duplicate avoidance', true),
  ('max_keywords_per_region_per_day', '20', 'Hard cap on keywords selected per region per day', true),
  ('min_keywords_per_region_per_day', '5', 'Minimum keywords to select per region per day', true),
  ('auto_generate_keywords', 'true', 'Whether to auto-generate keywords from templates', true),
  ('lead_finder_batch_size', '10', 'Max keywords to send to Lead Finder in one batch', true),
  ('enable_lead_finder_integration', 'true', 'Whether to actually call Lead Finder API', true),
  ('notification_on_failure', 'true', 'Send notification on run failure', true)
on conflict (config_key) do nothing;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to calculate performance score
create or replace function public.calculate_performance_score(
  p_lead_rate numeric,
  p_new_lead_rate numeric,
  p_verification_rate numeric,
  p_approval_rate numeric,
  p_reply_rate numeric,
  p_conversion_rate numeric,
  p_weights jsonb default '{"lead_rate": 0.25, "new_lead_rate": 0.25, "verification_rate": 0.15, "approval_rate": 0.15, "reply_rate": 0.1, "conversion_rate": 0.1}'::jsonb
)
returns numeric
language sql immutable as $$
  select round(
    coalesce(p_lead_rate, 0) * coalesce(p_weights->>'lead_rate', '0.25')::numeric +
    coalesce(p_new_lead_rate, 0) * coalesce(p_weights->>'new_lead_rate', '0.25')::numeric +
    coalesce(p_verification_rate, 0) * coalesce(p_weights->>'verification_rate', '0.15')::numeric +
    coalesce(p_approval_rate, 0) * coalesce(p_weights->>'approval_rate', '0.15')::numeric +
    coalesce(p_reply_rate, 0) * coalesce(p_weights->>'reply_rate', '0.1')::numeric +
    coalesce(p_conversion_rate, 0) * coalesce(p_weights->>'conversion_rate', '0.1')::numeric
    , 2) * 100
$$;

-- Function to get next region in rotation
create or replace function public.get_next_region_in_rotation(p_current_region text default null)
returns table (
  region_code text,
  region_name text,
  display_order integer,
  keyword_templates jsonb,
  business_categories jsonb,
  city_modifiers jsonb,
  language_modifiers jsonb,
  max_keywords_per_day integer,
  min_keywords_per_day integer
)
language sql stable as $$
  with config as (
    select config_value #>> '{}' as rotation_mode_value 
    from public.keyword_intelligence_config 
    where config_key = 'rotation_mode'
  ),
  fixed_region as (
    select config_value #>> '{}' as region_code_value
    from public.keyword_intelligence_config 
    where config_key = 'fixed_region_code'
  ),
  active_regions as (
    select region_code, region_name, display_order, keyword_templates, business_categories,
           city_modifiers, language_modifiers, max_keywords_per_day, min_keywords_per_day
    from public.region_rotation
    where is_active = true
    order by display_order
  )
  select * from active_regions
  where (
    -- Manual mode: return fixed region
    (select rotation_mode_value from config) = 'manual'
    and region_code = (select region_code_value from fixed_region)
    and (select region_code_value from fixed_region) is not null
    and (select region_code_value from fixed_region) != 'null'
    -- Sequential mode: return region after current, or first if none
    or (select rotation_mode_value from config) = 'sequential'
    and (
      p_current_region is null
      or display_order > (select display_order from public.region_rotation where region_code = p_current_region)
    )
    -- Performance mode handled in application layer (needs performance data)
  )
  order by display_order
  limit 1;
$$;

-- Function to get recent keyword usage for duplicate avoidance
create or replace function public.get_recent_keywords(p_days int default 14, p_region_code text default null)
returns table (
  keyword_id uuid,
  keyword text,
  normalized_keyword text,
  last_used_at timestamptz,
  region_code text
)
language sql stable as $$
  select
    kp.id as keyword_id,
    kp.keyword,
    kp.normalized_keyword,
    kp.last_used_at,
    dkr.region_code
  from public.keyword_pool kp
  join public.keyword_usage_log kul on kul.keyword_id = kp.id
  join public.daily_keyword_selections dks on dks.keyword_id = kp.id
  join public.daily_keyword_runs dkr on dkr.id = dks.run_id
  where kul.event_type in ('search_started', 'search_completed')
    and kul.created_at >= (now() - p_days * interval '1 day')
    and (p_region_code is null or dkr.region_code = p_region_code)
  group by kp.id, kp.keyword, kp.normalized_keyword, kp.last_used_at, dkr.region_code
  order by max(kul.created_at) desc;
$$;

-- Function to get keyword performance for a region
create or replace function public.get_region_keyword_performance(
  p_region_code text,
  p_window_days int default 30,
  p_min_searches int default 1
)
returns table (
  keyword_id uuid,
  keyword text,
  normalized_keyword text,
  total_searches int,
  total_leads_found int,
  total_new_leads int,
  lead_rate numeric,
  new_lead_rate numeric,
  performance_score numeric,
  region_rank int
)
language sql stable as $$
  with window_bounds as (
    select
      (current_date - p_window_days)::date as window_start,
      current_date as window_end
  ),
  agg as (
    select
      kp.keyword_id,
      kp.keyword,
      kp.normalized_keyword,
      sum(kp.total_searches) as total_searches,
      sum(kp.total_leads_found) as total_leads_found,
      sum(kp.total_new_leads) as total_new_leads,
      case when sum(kp.total_searches) > 0
           then sum(kp.total_leads_found)::numeric / sum(kp.total_searches)
           else 0 end as lead_rate,
      case when sum(kp.total_searches) > 0
           then sum(kp.total_new_leads)::numeric / sum(kp.total_searches)
           else 0 end as new_lead_rate,
      kp.performance_score
    from public.keyword_performance kp, window_bounds wb
    where kp.region_code = p_region_code
      and kp.window_start >= wb.window_start
      and kp.window_end <= wb.window_end
      and kp.total_searches >= p_min_searches
    group by kp.keyword_id, kp.keyword, kp.normalized_keyword, kp.performance_score
  )
  select
    keyword_id,
    keyword,
    normalized_keyword,
    total_searches,
    total_leads_found,
    total_new_leads,
    lead_rate,
    new_lead_rate,
    performance_score,
    row_number() over (order by performance_score desc, lead_rate desc, new_lead_rate desc) as region_rank
  from agg
  order by performance_score desc, lead_rate desc, new_lead_rate desc;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Updated_at triggers
create trigger trg_region_rotation_updated
  before update on public.region_rotation
  for each row execute function public.update_updated_at_column();

create trigger trg_keyword_performance_updated
  before update on public.keyword_performance
  for each row execute function public.update_updated_at_column();

create trigger trg_daily_runs_updated
  before update on public.daily_keyword_runs
  for each row execute function public.update_updated_at_column();

create trigger trg_daily_selections_updated
  before update on public.daily_keyword_selections
  for each row execute function public.update_updated_at_column();

create trigger trg_keyword_templates_updated
  before update on public.keyword_templates
  for each row execute function public.update_updated_at_column();

create trigger trg_keyword_intelligence_config_updated
  before update on public.keyword_intelligence_config
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table public.region_rotation enable row level security;
alter table public.keyword_performance enable row level security;
alter table public.daily_keyword_runs enable row level security;
alter table public.daily_keyword_selections enable row level security;
alter table public.keyword_templates enable row level security;
alter table public.keyword_intelligence_config enable row level security;

do $$
declare
  tbl text;
  tables text[] := array[
    'region_rotation', 'keyword_performance', 'daily_keyword_runs',
    'daily_keyword_selections', 'keyword_templates', 'keyword_intelligence_config'
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
-- SEED DATA: Default Indian States/Regions for Rotation
-- ============================================================

insert into public.region_rotation (
  region_code, region_name, display_order,
  keyword_templates, business_categories, city_modifiers, language_modifiers,
  max_keywords_per_day, min_keywords_per_day, performance_weight
) values
  ('BR', 'Bihar', 1,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Business", "Politics", "Education", "Agriculture", "Healthcare", "Technology", "Tourism", "Real Estate"]'::jsonb,
   '["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia", "Arrah", "Begusarai"]'::jsonb,
   '["हिंदी", "English", "Urdu", "Bhojpuri", "Maithili"]'::jsonb,
   20, 5, 1.0),
  ('UP', 'Uttar Pradesh', 2,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Business", "Politics", "Education", "Agriculture", "Healthcare", "Technology", "Manufacturing", "Tourism", "Real Estate"]'::jsonb,
   '["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Meerut", "Ghaziabad", "Noida", "Gorakhpur"]'::jsonb,
   '["हिंदी", "English", "Urdu", "Awadhi", "Bhojpuri"]'::jsonb,
   20, 5, 1.0),
  ('MH', 'Maharashtra', 3,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Business", "Finance", "Technology", "Entertainment", "Manufacturing", "Real Estate", "Education", "Healthcare"]'::jsonb,
   '["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Thane"]'::jsonb,
   '["Marathi", "हिंदी", "English", "Gujarati"]'::jsonb,
   20, 5, 1.2),
  ('DL', 'Delhi NCR', 4,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Business", "Politics", "Technology", "Finance", "Education", "Healthcare", "Real Estate", "Startups"]'::jsonb,
   '["New Delhi", "Gurugram", "Noida", "Faridabad", "Ghaziabad", "Delhi"]'::jsonb,
   '["हिंदी", "English", "Punjabi", "Urdu"]'::jsonb,
   15, 5, 1.3),
  ('KA', 'Karnataka', 5,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Technology", "Business", "Education", "Healthcare", "Aerospace", "Biotech", "Real Estate", "Tourism"]'::jsonb,
   '["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Kalaburagi"]'::jsonb,
   '["Kannada", "English", "हिंदी", "Tamil", "Telugu"]'::jsonb,
   15, 5, 1.1),
  ('TN', 'Tamil Nadu', 6,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Technology", "Manufacturing", "Automotive", "Healthcare", "Education", "Tourism", "Textiles", "Real Estate"]'::jsonb,
   '["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"]'::jsonb,
   '["Tamil", "English", "हिंदी", "Telugu"]'::jsonb,
   15, 5, 1.1),
  ('GJ', 'Gujarat', 7,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Business", "Manufacturing", "Textiles", "Chemicals", "Pharmaceuticals", "Real Estate", "Tourism", "Agriculture"]'::jsonb,
   '["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"]'::jsonb,
   '["Gujarati", "हिंदी", "English"]'::jsonb,
   15, 5, 1.0),
  ('WB', 'West Bengal', 8,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Business", "Technology", "Education", "Healthcare", "Manufacturing", "Tourism", "Real Estate", "Culture"]'::jsonb,
   '["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Malda"]'::jsonb,
   '["Bengali", "हिंदी", "English"]'::jsonb,
   15, 5, 1.0),
  ('RJ', 'Rajasthan', 9,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Tourism", "Business", "Mining", "Agriculture", "Education", "Healthcare", "Real Estate", "Textiles"]'::jsonb,
   '["Jaipur", "Jodhpur", "Kota", "Bikaner", "Udaipur", "Ajmer"]'::jsonb,
   '["हिंदी", "English", "Rajasthani", "Marwari"]'::jsonb,
   15, 5, 1.0),
  ('KL', 'Kerala', 10,
   '["{region} News", "{region} {category}", "{city} News", "{city} {category}"]'::jsonb,
   '["Tourism", "Healthcare", "Education", "Technology", "Agriculture", "Fisheries", "Real Estate", "Ayurveda"]'::jsonb,
   '["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad"]'::jsonb,
   '["Malayalam", "English", "हिंदी", "Tamil"]'::jsonb,
   15, 5, 1.0)
on conflict (region_code) do update set
  region_name = excluded.region_name,
  display_order = excluded.display_order,
  keyword_templates = excluded.keyword_templates,
  business_categories = excluded.business_categories,
  city_modifiers = excluded.city_modifiers,
  language_modifiers = excluded.language_modifiers,
  max_keywords_per_day = excluded.max_keywords_per_day,
  min_keywords_per_day = excluded.min_keywords_per_day,
  performance_weight = excluded.performance_weight,
  updated_at = now();

-- Seed keyword templates
insert into public.keyword_templates (name, description, region_code, base_patterns, category_modifiers, city_modifiers, language_modifiers, suffixes, max_combinations_per_run, priority, source_tag, is_active) values
  ('India News Base', 'Generic India-wide news patterns', null,
   '["{region} News", "{region} {category}", "{region} {category} News"]'::jsonb,
   '["Business", "Politics", "Technology", "Sports", "Entertainment", "Education", "Healthcare"]'::jsonb,
   '[]'::jsonb,
   '["हिंदी", "English"]'::jsonb,
   '["Live", "Updates", "Today", "Breaking", "Latest", "Headlines", "Now"]'::jsonb,
   30, 5, 'generated', true),
  ('Bihar Local', 'Bihar-specific local patterns', 'BR',
   '["{city} News", "{city} {category}", "{city} {category} News", "{region} {city} {category}"]'::jsonb,
   '["Business", "Politics", "Education", "Agriculture", "Healthcare", "Government Jobs", "Exam Results"]'::jsonb,
   '["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia"]'::jsonb,
   '["हिंदी", "Bhojpuri", "Maithili", "English"]'::jsonb,
   '["Live", "Updates", "Today", "Breaking", "Latest", "Result", "Admit Card"]'::jsonb,
   40, 3, 'generated', true),
  ('Metro Business', 'Metro city business focus', null,
   '["{city} Business", "{city} Startup", "{city} Corporate", "{city} Industry", "{city} Economy"]'::jsonb,
   '["Technology", "Finance", "Real Estate", "Manufacturing", "E-commerce", "FinTech", "EdTech", "HealthTech"]'::jsonb,
   '["Mumbai", "Delhi", "Bengaluru", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"]'::jsonb,
   '["English", "हिंदी"]'::jsonb,
   '["News", "Updates", "Today", "Insights", "Trends", "Report"]'::jsonb,
   35, 4, 'generated', true)
on conflict (name) do update set
  description = excluded.description,
  region_code = excluded.region_code,
  base_patterns = excluded.base_patterns,
  category_modifiers = excluded.category_modifiers,
  city_modifiers = excluded.city_modifiers,
  language_modifiers = excluded.language_modifiers,
  suffixes = excluded.suffixes,
  max_combinations_per_run = excluded.max_combinations_per_run,
  priority = excluded.priority,
  source_tag = excluded.source_tag,
  is_active = excluded.is_active,
  updated_at = now();

-- Comments
comment on table public.region_rotation is 'Phase 3: Configurable ordered list of states/regions for daily keyword rotation';
comment on table public.keyword_performance is 'Phase 3: Aggregated keyword performance metrics for intelligent prioritization';
comment on table public.daily_keyword_runs is 'Phase 3: Daily execution log for keyword intelligence engine runs';
comment on table public.daily_keyword_selections is 'Phase 3: Per-keyword selection details within each daily run';
comment on table public.keyword_templates is 'Phase 3: Reusable templates for deterministic keyword generation per region';
comment on table public.keyword_intelligence_config is 'Phase 3: Global configuration for the keyword intelligence engine';
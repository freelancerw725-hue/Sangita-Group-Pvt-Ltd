-- Knowledge Graph Enhancements
-- Adds vector search, validation tracking, and health monitoring

-- Enable pgvector extension for semantic search
create extension if not exists vector;

-- ============================================================
-- VECTOR EMBEDDINGS: Semantic search support
-- ============================================================

-- Add embedding column to existing nodes table
alter table public.project_graph_nodes 
  add column if not exists embedding vector(1536); -- OpenAI ada-002 dimension

-- Create index for vector similarity search
create index if not exists idx_graph_nodes_embedding 
  on public.project_graph_nodes 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- VALIDATION TRACKING: Broken imports, schema mismatches
-- ============================================================

create table if not exists public.project_graph_validation (
  id uuid primary key default gen_random_uuid(),
  
  -- Validation type
  validation_type text not null check (validation_type in (
    'broken_import', 
    'missing_function',
    'schema_mismatch',
    'unused_dependency',
    'type_error',
    'missing_migration'
  )),
  
  -- Location
  node_id uuid references public.project_graph_nodes(id) on delete cascade,
  file_path text,
  line_number integer,
  
  -- Issue details
  severity text not null check (severity in ('error', 'warning', 'info')),
  message text not null,
  details jsonb default '{}'::jsonb,
  
  -- Resolution
  status text default 'open' check (status in ('open', 'resolved', 'ignored')),
  resolved_at timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_graph_validation_type on public.project_graph_validation (validation_type);
create index if not exists idx_graph_validation_severity on public.project_graph_validation (severity);
create index if not exists idx_graph_validation_status on public.project_graph_validation (status);
create index if not exists idx_graph_validation_node on public.project_graph_validation (node_id);

-- ============================================================
-- GRAPH HEALTH: System health monitoring
-- ============================================================

create table if not exists public.project_graph_health (
  id uuid primary key default gen_random_uuid(),
  
  -- Snapshot time
  snapshot_at timestamptz not null default now(),
  
  -- Stats
  total_nodes integer not null,
  total_edges integer not null,
  indexed_files integer not null,
  
  -- Health metrics
  broken_imports integer not null default 0,
  schema_mismatches integer not null default 0,
  stale_nodes integer not null default 0,
  indexing_errors integer not null default 0,
  
  -- Performance
  last_full_index_duration_ms integer,
  last_incremental_index_duration_ms integer,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_graph_health_snapshot on public.project_graph_health (snapshot_at desc);

-- ============================================================
-- GIT TRACKING: Git commit/file change tracking
-- ============================================================

create table if not exists public.project_graph_git_sync (
  id uuid primary key default gen_random_uuid(),
  
  -- Git info
  commit_hash text,
  branch text,
  author text,
  commit_message text,
  
  -- Changed files
  files_changed text[] not null,
  files_added text[],
  files_deleted text[],
  files_renamed jsonb, -- {"old": "new"}
  
  -- Sync status
  sync_status text default 'pending' check (sync_status in ('pending', 'syncing', 'completed', 'failed')),
  synced_at timestamptz,
  
  created_at timestamptz not null default now()
);

create index if not exists idx_graph_git_sync_commit on public.project_graph_git_sync (commit_hash);
create index if not exists idx_graph_git_sync_status on public.project_graph_git_sync (sync_status);
create index if not exists idx_graph_git_sync_created on public.project_graph_git_sync (created_at desc);

-- ============================================================
-- ENHANCED RPC FUNCTIONS
-- ============================================================

-- Semantic search using embeddings
create or replace function public.semantic_search_nodes(
  p_query_embedding vector(1536),
  p_similarity_threshold float default 0.7,
  p_limit integer default 20
)
returns table (
  node_id uuid,
  node_path text,
  node_type text,
  node_name text,
  feature text,
  metadata jsonb,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    n.id,
    n.path,
    n.node_type,
    n.name,
    n.feature,
    n.metadata,
    1 - (n.embedding <=> p_query_embedding) as similarity
  from public.project_graph_nodes n
  where 
    n.embedding is not null
    and n.status = 'active'
    and 1 - (n.embedding <=> p_query_embedding) > p_similarity_threshold
  order by n.embedding <=> p_query_embedding
  limit p_limit;
end;
$$;

-- Hybrid search: combines keyword + vector search
create or replace function public.hybrid_search_nodes(
  p_query text,
  p_query_embedding vector(1536) default null,
  p_limit integer default 20
)
returns table (
  node_id uuid,
  node_path text,
  node_type text,
  node_name text,
  feature text,
  metadata jsonb,
  combined_score float
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    n.id,
    n.path,
    n.node_type,
    n.name,
    n.feature,
    n.metadata,
    -- Combine text search rank and vector similarity
    (
      ts_rank(to_tsvector('english', n.search_text), plainto_tsquery('english', p_query)) * 0.5 +
      case 
        when p_query_embedding is not null and n.embedding is not null 
        then (1 - (n.embedding <=> p_query_embedding)) * 0.5
        else 0
      end
    ) as combined_score
  from public.project_graph_nodes n
  where 
    n.status = 'active'
    and (
      to_tsvector('english', n.search_text) @@ plainto_tsquery('english', p_query)
      or (p_query_embedding is not null and n.embedding is not null)
    )
  order by combined_score desc
  limit p_limit;
end;
$$;

-- Get graph health snapshot
create or replace function public.get_graph_health()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'total_nodes', (select count(*) from project_graph_nodes where status = 'active'),
    'total_edges', (select count(*) from project_graph_edges),
    'indexed_files', (select count(*) from project_graph_nodes where node_type in ('file', 'route', 'api', 'component', 'service')),
    'broken_imports', (select count(*) from project_graph_validation where validation_type = 'broken_import' and status = 'open'),
    'schema_mismatches', (select count(*) from project_graph_validation where validation_type = 'schema_mismatch' and status = 'open'),
    'stale_nodes', (select count(*) from project_graph_nodes where last_indexed_at < now() - interval '7 days'),
    'last_index_job', (select row_to_json(j.*) from project_graph_index_jobs j order by created_at desc limit 1),
    'validation_summary', (
      select jsonb_object_agg(validation_type, count)
      from (
        select validation_type, count(*) as count
        from project_graph_validation
        where status = 'open'
        group by validation_type
      ) sub
    )
  ) into v_result;
  
  return v_result;
end;
$$;

-- Get validation issues
create or replace function public.get_validation_issues(
  p_severity text default null,
  p_type text default null,
  p_limit integer default 100
)
returns table (
  issue_id uuid,
  validation_type text,
  file_path text,
  line_number integer,
  severity text,
  message text,
  details jsonb,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    v.id,
    v.validation_type,
    v.file_path,
    v.line_number,
    v.severity,
    v.message,
    v.details,
    v.created_at
  from public.project_graph_validation v
  where 
    v.status = 'open'
    and (p_severity is null or v.severity = p_severity)
    and (p_type is null or v.validation_type = p_type)
  order by 
    case v.severity
      when 'error' then 1
      when 'warning' then 2
      when 'info' then 3
    end,
    v.created_at desc
  limit p_limit;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update validation updated_at
create or replace function public.update_validation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_graph_validation_updated_at
  before update on public.project_graph_validation
  for each row
  execute function public.update_validation_updated_at();

-- ============================================================
-- RLS POLICIES (extend existing)
-- ============================================================

alter table public.project_graph_validation enable row level security;
alter table public.project_graph_health enable row level security;
alter table public.project_graph_git_sync enable row level security;

create policy "Allow read access to validation" on public.project_graph_validation
  for select using (true);

create policy "Allow read access to health" on public.project_graph_health
  for select using (true);

create policy "Allow read access to git sync" on public.project_graph_git_sync
  for select using (true);

create policy "Service role can manage validation" on public.project_graph_validation
  for all using (auth.role() = 'service_role');

create policy "Service role can manage health" on public.project_graph_health
  for all using (auth.role() = 'service_role');

create policy "Service role can manage git sync" on public.project_graph_git_sync
  for all using (auth.role() = 'service_role');

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.project_graph_validation is 'Tracks validation issues like broken imports and schema mismatches';
comment on table public.project_graph_health is 'Graph health monitoring and metrics';
comment on table public.project_graph_git_sync is 'Git commit tracking for automatic synchronization';

comment on function public.semantic_search_nodes is 'Vector similarity search using embeddings';
comment on function public.hybrid_search_nodes is 'Combines keyword search and vector similarity';
comment on function public.get_graph_health is 'Get current graph health status';
comment on function public.get_validation_issues is 'Retrieve validation issues with filtering';

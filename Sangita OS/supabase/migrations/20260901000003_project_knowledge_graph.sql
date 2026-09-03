-- Project Knowledge Graph (AI Brain) for Sangita OS
-- Stores compact metadata about code structure for AI-assisted development
-- Does NOT duplicate code - only indexes structure and relationships

-- ============================================================
-- GRAPH NODES: Code entities (files, functions, components, DB objects)
-- ============================================================

create table if not exists public.project_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  
  -- Node identity
  node_type text not null check (node_type in (
    'file', 'route', 'api', 'component', 'hook', 'service',
    'function', 'class', 'db_table', 'db_rpc', 'db_migration',
    'db_policy', 'feature', 'config'
  )),
  path text not null, -- File path or DB object name
  name text not null,
  
  -- Feature/module grouping
  feature text, -- bulk-email, crm, keywords, ai-insights, etc.
  module text, -- More granular grouping
  
  -- Metadata (compact, searchable)
  metadata jsonb not null default '{}'::jsonb,
  -- Examples:
  -- { "exports": ["ComponentName", "helperFn"], "lines": 245, "hasTests": true }
  -- { "methods": ["GET", "POST"], "endpoint": "/api/customers" }
  -- { "columns": ["id", "name", "email"], "hasRLS": true }
  
  -- Search optimization
  search_text text, -- Combined searchable text
  
  -- Status
  status text default 'active' check (status in ('active', 'deprecated', 'planned')),
  has_tests boolean default false,
  has_errors boolean default false,
  
  -- Audit
  last_indexed_at timestamptz not null default now(),
  file_hash text, -- For detecting changes
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast queries
create index if not exists idx_graph_nodes_type on public.project_graph_nodes (node_type);
create index if not exists idx_graph_nodes_feature on public.project_graph_nodes (feature);
create index if not exists idx_graph_nodes_path on public.project_graph_nodes (path);
create index if not exists idx_graph_nodes_name on public.project_graph_nodes (name);
create index if not exists idx_graph_nodes_search on public.project_graph_nodes using gin(to_tsvector('english', search_text));
create index if not exists idx_graph_nodes_status on public.project_graph_nodes (status);
create index if not exists idx_graph_nodes_indexed_at on public.project_graph_nodes (last_indexed_at desc);
create index if not exists idx_graph_nodes_metadata on public.project_graph_nodes using gin(metadata);

-- Unique constraint on path for files/DB objects
create unique index if not exists idx_graph_nodes_path_unique on public.project_graph_nodes (path) 
  where node_type in ('file', 'route', 'api', 'component', 'service', 'db_table', 'db_rpc', 'db_migration', 'db_policy');

-- ============================================================
-- GRAPH EDGES: Relationships between nodes
-- ============================================================

create table if not exists public.project_graph_edges (
  id uuid primary key default gen_random_uuid(),
  
  -- Relationship
  source_id uuid not null references public.project_graph_nodes(id) on delete cascade,
  target_id uuid not null references public.project_graph_nodes(id) on delete cascade,
  
  -- Edge type
  edge_type text not null check (edge_type in (
    'imports', 'exports', 'depends_on', 'uses_table', 'calls_rpc',
    'implements_feature', 'tests', 'references', 'extends', 'composes'
  )),
  
  -- Optional metadata
  metadata jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_graph_edges_source on public.project_graph_edges (source_id);
create index if not exists idx_graph_edges_target on public.project_graph_edges (target_id);
create index if not exists idx_graph_edges_type on public.project_graph_edges (edge_type);

-- Prevent duplicate edges
create unique index if not exists idx_graph_edges_unique 
  on public.project_graph_edges (source_id, target_id, edge_type);

-- ============================================================
-- INDEXING JOBS: Track scan/re-index operations
-- ============================================================

create table if not exists public.project_graph_index_jobs (
  id uuid primary key default gen_random_uuid(),
  
  job_type text not null check (job_type in ('full_scan', 'incremental', 'file_change', 'db_sync')),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  
  -- Stats
  files_scanned integer default 0,
  nodes_created integer default 0,
  nodes_updated integer default 0,
  edges_created integer default 0,
  errors jsonb default '[]'::jsonb,
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  
  created_at timestamptz not null default now()
);

create index if not exists idx_graph_jobs_status on public.project_graph_index_jobs (status);
create index if not exists idx_graph_jobs_created on public.project_graph_index_jobs (created_at desc);

-- ============================================================
-- AI CONTEXT CACHE: Store AI query results for faster retrieval
-- ============================================================

create table if not exists public.project_graph_ai_cache (
  id uuid primary key default gen_random_uuid(),
  
  -- Query
  query_text text not null,
  query_hash text not null, -- Hash for deduplication
  
  -- Result
  relevant_nodes uuid[] not null,
  context_summary jsonb not null, -- Compact summary for AI
  
  -- Usage stats
  hit_count integer default 1,
  last_used_at timestamptz not null default now(),
  
  created_at timestamptz not null default now()
);

create index if not exists idx_graph_cache_hash on public.project_graph_ai_cache (query_hash);
create index if not exists idx_graph_cache_last_used on public.project_graph_ai_cache (last_used_at desc);

-- ============================================================
-- RPC FUNCTIONS: Graph queries
-- ============================================================

-- Get dependency chain for a node
create or replace function public.get_dependency_chain(
  p_node_path text,
  p_max_depth integer default 5
)
returns table (
  node_id uuid,
  node_path text,
  node_type text,
  node_name text,
  depth integer,
  relationship text
)
language plpgsql
security definer
as $$
declare
  v_node_id uuid;
begin
  -- Get the starting node
  select id into v_node_id
  from public.project_graph_nodes
  where path = p_node_path
  limit 1;
  
  if v_node_id is null then
    return;
  end if;
  
  -- Recursive CTE to traverse dependencies
  return query
  with recursive deps as (
    -- Base case
    select 
      n.id,
      n.path,
      n.node_type,
      n.name,
      0 as depth,
      'self'::text as relationship
    from public.project_graph_nodes n
    where n.id = v_node_id
    
    union all
    
    -- Recursive case
    select 
      n.id,
      n.path,
      n.node_type,
      n.name,
      d.depth + 1,
      e.edge_type::text
    from deps d
    join public.project_graph_edges e on e.source_id = d.id
    join public.project_graph_nodes n on n.id = e.target_id
    where d.depth < p_max_depth
  )
  select * from deps;
end;
$$;

-- Get reverse dependencies (what depends on this node)
create or replace function public.get_reverse_dependencies(
  p_node_path text,
  p_max_depth integer default 3
)
returns table (
  node_id uuid,
  node_path text,
  node_type text,
  node_name text,
  depth integer,
  relationship text
)
language plpgsql
security definer
as $$
declare
  v_node_id uuid;
begin
  select id into v_node_id
  from public.project_graph_nodes
  where path = p_node_path
  limit 1;
  
  if v_node_id is null then
    return;
  end if;
  
  return query
  with recursive reverse_deps as (
    select 
      n.id,
      n.path,
      n.node_type,
      n.name,
      0 as depth,
      'self'::text as relationship
    from public.project_graph_nodes n
    where n.id = v_node_id
    
    union all
    
    select 
      n.id,
      n.path,
      n.node_type,
      n.name,
      rd.depth + 1,
      e.edge_type::text
    from reverse_deps rd
    join public.project_graph_edges e on e.target_id = rd.id
    join public.project_graph_nodes n on n.id = e.source_id
    where rd.depth < p_max_depth
  )
  select * from reverse_deps;
end;
$$;

-- Search nodes by text
create or replace function public.search_graph_nodes(
  p_query text,
  p_node_types text[] default null,
  p_features text[] default null,
  p_limit integer default 50
)
returns table (
  node_id uuid,
  node_path text,
  node_type text,
  node_name text,
  feature text,
  metadata jsonb,
  rank real
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
    ts_rank(to_tsvector('english', n.search_text), plainto_tsquery('english', p_query)) as rank
  from public.project_graph_nodes n
  where 
    to_tsvector('english', n.search_text) @@ plainto_tsquery('english', p_query)
    and (p_node_types is null or n.node_type = any(p_node_types))
    and (p_features is null or n.feature = any(p_features))
    and n.status = 'active'
  order by rank desc
  limit p_limit;
end;
$$;

-- Get feature overview
create or replace function public.get_feature_overview(
  p_feature text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'feature', p_feature,
    'total_nodes', count(*),
    'by_type', jsonb_object_agg(node_type, type_count),
    'files', jsonb_agg(distinct path) filter (where node_type in ('file', 'route', 'api', 'component')),
    'db_objects', jsonb_agg(distinct path) filter (where node_type like 'db_%'),
    'has_tests', bool_or(has_tests),
    'has_errors', bool_or(has_errors),
    'last_updated', max(updated_at)
  ) into v_result
  from (
    select 
      node_type,
      count(*) as type_count,
      path,
      has_tests,
      has_errors,
      updated_at
    from public.project_graph_nodes
    where feature = p_feature
      and status = 'active'
    group by node_type, path, has_tests, has_errors, updated_at
  ) sub
  group by node_type;
  
  return coalesce(v_result, '{}'::jsonb);
end;
$$;

-- Get AI context for a query (optimized for AI agents)
create or replace function public.get_ai_context(
  p_user_query text,
  p_max_nodes integer default 20
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_cache_hash text;
  v_cached jsonb;
  v_relevant_nodes jsonb;
begin
  -- Generate cache hash
  v_cache_hash := encode(digest(p_user_query, 'sha256'), 'hex');
  
  -- Check cache
  select context_summary into v_cached
  from public.project_graph_ai_cache
  where query_hash = v_cache_hash
    and last_used_at > now() - interval '1 hour'
  limit 1;
  
  if v_cached is not null then
    -- Update cache hit count
    update public.project_graph_ai_cache
    set hit_count = hit_count + 1,
        last_used_at = now()
    where query_hash = v_cache_hash;
    
    return v_cached;
  end if;
  
  -- Search and build context
  select jsonb_build_object(
    'query', p_user_query,
    'nodes', jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'path', n.path,
        'type', n.node_type,
        'name', n.name,
        'feature', n.feature,
        'metadata', n.metadata,
        'relevance', rank
      )
    ),
    'features_involved', jsonb_agg(distinct n.feature) filter (where n.feature is not null),
    'total_results', count(*)
  ) into v_relevant_nodes
  from public.search_graph_nodes(p_user_query, null, null, p_max_nodes) n;
  
  -- Cache result
  insert into public.project_graph_ai_cache (query_text, query_hash, relevant_nodes, context_summary)
  values (
    p_user_query,
    v_cache_hash,
    array(select (jsonb_array_elements(v_relevant_nodes->'nodes')->>'id')::uuid),
    v_relevant_nodes
  );
  
  return v_relevant_nodes;
end;
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table public.project_graph_nodes enable row level security;
alter table public.project_graph_edges enable row level security;
alter table public.project_graph_index_jobs enable row level security;
alter table public.project_graph_ai_cache enable row level security;

-- Allow all authenticated users to read graph data
create policy "Allow read access to graph nodes" on public.project_graph_nodes
  for select using (true);

create policy "Allow read access to graph edges" on public.project_graph_edges
  for select using (true);

create policy "Allow read access to index jobs" on public.project_graph_index_jobs
  for select using (true);

create policy "Allow read access to AI cache" on public.project_graph_ai_cache
  for select using (true);

-- Only service role can write (indexer runs as service role)
create policy "Service role can manage nodes" on public.project_graph_nodes
  for all using (auth.role() = 'service_role');

create policy "Service role can manage edges" on public.project_graph_edges
  for all using (auth.role() = 'service_role');

create policy "Service role can manage jobs" on public.project_graph_index_jobs
  for all using (auth.role() = 'service_role');

create policy "Service role can manage cache" on public.project_graph_ai_cache
  for all using (auth.role() = 'service_role');

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_graph_nodes_updated_at
  before update on public.project_graph_nodes
  for each row
  execute function public.update_updated_at_column();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.project_graph_nodes is 'Project knowledge graph nodes - compact metadata about code entities';
comment on table public.project_graph_edges is 'Relationships between graph nodes (imports, dependencies, etc.)';
comment on table public.project_graph_index_jobs is 'Track indexing job status and statistics';
comment on table public.project_graph_ai_cache is 'Cache AI context queries for faster retrieval';

comment on function public.get_dependency_chain is 'Trace forward dependencies of a node';
comment on function public.get_reverse_dependencies is 'Find what depends on a node (impact analysis)';
comment on function public.search_graph_nodes is 'Full-text search across graph nodes';
comment on function public.get_feature_overview is 'Get comprehensive overview of a feature';
comment on function public.get_ai_context is 'Get AI-optimized context for a user query';

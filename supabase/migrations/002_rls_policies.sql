-- ============================================================
-- NexOS — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ── Enable RLS on every table ──────────────────────────────

alter table public.profiles          enable row level security;
alter table public.agents            enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.reports           enable row level security;
alter table public.agora_profiles    enable row level security;
alter table public.agora_connections enable row level security;
alter table public.agent_status_log  enable row level security;
alter table public.kpi_snapshots     enable row level security;
alter table public.tool_connections  enable row level security;


-- ============================================================
-- PROFILES
-- ============================================================

-- Users can only read/update their own profile
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert handled exclusively by the handle_new_user() trigger.
-- No client-side insert is allowed.
-- (No insert policy here = default deny for authenticated users; trigger
--  runs as security definer with row_security=off so it bypasses RLS.)


-- ============================================================
-- AGENTS
-- ============================================================

create policy "agents: select own"
  on public.agents for select
  using (auth.uid() = user_id);

create policy "agents: insert own"
  on public.agents for insert
  with check (auth.uid() = user_id);

create policy "agents: update own"
  on public.agents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "agents: delete own"
  on public.agents for delete
  using (auth.uid() = user_id);


-- ============================================================
-- CONVERSATIONS
-- ============================================================

create policy "conversations: select own"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "conversations: insert own"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "conversations: update own"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "conversations: delete own"
  on public.conversations for delete
  using (auth.uid() = user_id);


-- ============================================================
-- MESSAGES  (scoped through conversations)
-- ============================================================

create policy "messages: select via conversation"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages: insert via conversation"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages: delete via conversation"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );


-- ============================================================
-- REPORTS
-- ============================================================

create policy "reports: select own"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "reports: insert own"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "reports: update own"
  on public.reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reports: delete own"
  on public.reports for delete
  using (auth.uid() = user_id);


-- ============================================================
-- AGORA PROFILES
-- ============================================================

-- Public profiles visible to all authenticated users
create policy "agora: select public"
  on public.agora_profiles for select
  using (
    is_public = true
    or auth.uid() = user_id
  );

create policy "agora: insert own"
  on public.agora_profiles for insert
  with check (auth.uid() = user_id);

create policy "agora: update own"
  on public.agora_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "agora: delete own"
  on public.agora_profiles for delete
  using (auth.uid() = user_id);


-- ============================================================
-- AGORA CONNECTIONS
-- ============================================================

-- Can see connections where you are either party
create policy "connections: select own"
  on public.agora_connections for select
  using (
    exists (
      select 1 from public.agora_profiles ap
      where (ap.id = agora_connections.from_id or ap.id = agora_connections.to_id)
        and ap.user_id = auth.uid()
    )
  );

create policy "connections: insert own"
  on public.agora_connections for insert
  with check (
    exists (
      select 1 from public.agora_profiles ap
      where ap.id = agora_connections.from_id
        and ap.user_id = auth.uid()
    )
  );

create policy "connections: update own"
  on public.agora_connections for update
  using (
    exists (
      select 1 from public.agora_profiles ap
      where (ap.id = agora_connections.from_id or ap.id = agora_connections.to_id)
        and ap.user_id = auth.uid()
    )
  );


-- ============================================================
-- AGENT STATUS LOG
-- ============================================================

create policy "status_log: select own"
  on public.agent_status_log for select
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_status_log.agent_id
        and a.user_id = auth.uid()
    )
  );

-- Status log inserts come from server-side functions only
create policy "status_log: insert service role only"
  on public.agent_status_log for insert
  with check (false);  -- overridden by service_role key in backend


-- ============================================================
-- KPI SNAPSHOTS
-- ============================================================

create policy "kpis: select own"
  on public.kpi_snapshots for select
  using (auth.uid() = user_id);

create policy "kpis: insert service"
  on public.kpi_snapshots for insert
  with check (false);  -- only service_role can insert KPI snapshots


-- ============================================================
-- TOOL CONNECTIONS
-- ============================================================

create policy "tools: select own"
  on public.tool_connections for select
  using (auth.uid() = user_id);

create policy "tools: insert own"
  on public.tool_connections for insert
  with check (auth.uid() = user_id);

create policy "tools: update own"
  on public.tool_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tools: delete own"
  on public.tool_connections for delete
  using (auth.uid() = user_id);

-- ============================================================
-- NexOS — Realtime Subscriptions + Helper Functions
-- Migration: 003_realtime_and_functions.sql
-- Run AFTER 002_rls_policies.sql
-- ============================================================

-- ── Enable Realtime replication on key tables ──────────────

-- Supabase realtime uses pg_logical replication.
-- Add tables to the realtime publication:

alter publication supabase_realtime add table public.agents;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.kpi_snapshots;
alter publication supabase_realtime add table public.agent_status_log;


-- ============================================================
-- FUNCTION: get_agent_dashboard_summary
-- Returns a rolled-up view of all agents + their last message
-- for the dashboard sidebar.
-- ============================================================

create or replace function public.get_agent_dashboard_summary(p_user_id uuid)
returns table (
  agent_id       uuid,
  agent_type     agent_type,
  agent_name     text,
  status         agent_status,
  avatar_color   text,
  current_task   text,
  unread_count   integer,
  last_message   text,
  last_message_at timestamptz,
  conversation_id uuid
)
language sql security definer stable as $$
  select
    a.id                                              as agent_id,
    a.type                                            as agent_type,
    a.name                                            as agent_name,
    a.status,
    a.avatar_color,
    a.current_task,
    a.unread_count,
    m.content                                         as last_message,
    m.created_at                                      as last_message_at,
    c.id                                              as conversation_id
  from public.agents a
  left join lateral (
    -- most recent conversation for this agent
    select c2.id, c2.updated_at
    from public.conversations c2
    where c2.agent_id = a.id
      and c2.user_id  = p_user_id
    order by c2.updated_at desc
    limit 1
  ) c on true
  left join lateral (
    -- last message in that conversation
    select m2.content, m2.created_at
    from public.messages m2
    where m2.conversation_id = c.id
    order by m2.created_at desc
    limit 1
  ) m on true
  where a.user_id = p_user_id
  order by
    case a.type
      when 'orchestrator'        then 1
      when 'sales'               then 2
      when 'customer_service'    then 3
      when 'technical'           then 4
      when 'market_intelligence' then 5
      when 'meeting'             then 6
      when 'hr_ops'              then 7
    end;
$$;


-- ============================================================
-- FUNCTION: get_conversation_messages
-- Returns all messages for a conversation with pagination.
-- ============================================================

create or replace function public.get_conversation_messages(
  p_conversation_id uuid,
  p_limit           integer  default 50,
  p_before          timestamptz default null
)
returns table (
  id           uuid,
  role         message_role,
  content      text,
  content_type message_content_type,
  metadata     jsonb,
  created_at   timestamptz
)
language sql security definer stable as $$
  select
    m.id, m.role, m.content, m.content_type, m.metadata, m.created_at
  from public.messages m
  inner join public.conversations c on c.id = m.conversation_id
  where m.conversation_id = p_conversation_id
    and c.user_id = auth.uid()
    and (p_before is null or m.created_at < p_before)
  order by m.created_at asc
  limit p_limit;
$$;


-- ============================================================
-- FUNCTION: upsert_conversation_and_message
-- Atomically creates/reuses a conversation and inserts a message.
-- Returns the conversation_id and new message_id.
-- ============================================================

create or replace function public.upsert_conversation_and_message(
  p_agent_id       uuid,
  p_conversation_id uuid default null,
  p_role           message_role default 'user',
  p_content        text default '',
  p_content_type   message_content_type default 'text',
  p_metadata       jsonb default '{}'
)
returns table (
  conversation_id uuid,
  message_id      uuid
)
language plpgsql security definer as $$
declare
  v_conv_id  uuid;
  v_msg_id   uuid;
  v_user_id  uuid := auth.uid();
begin
  -- Validate agent belongs to user
  if not exists (
    select 1 from public.agents a
    where a.id = p_agent_id and a.user_id = v_user_id
  ) then
    raise exception 'Agent not found or not owned by user';
  end if;

  -- Reuse existing conversation or create new one
  if p_conversation_id is not null then
    select id into v_conv_id
    from public.conversations
    where id = p_conversation_id and user_id = v_user_id;
  end if;

  if v_conv_id is null then
    insert into public.conversations (user_id, agent_id)
    values (v_user_id, p_agent_id)
    returning id into v_conv_id;
  else
    -- Touch updated_at
    update public.conversations set updated_at = now() where id = v_conv_id;
  end if;

  -- Insert message
  insert into public.messages (conversation_id, role, content, content_type, metadata)
  values (v_conv_id, p_role, p_content, p_content_type, p_metadata)
  returning id into v_msg_id;

  -- Reset unread if user is sending
  if p_role = 'user' then
    update public.agents set unread_count = 0 where id = p_agent_id;
  else
    -- Increment unread for agent responses
    update public.agents set unread_count = unread_count + 1 where id = p_agent_id;
  end if;

  return query select v_conv_id, v_msg_id;
end;
$$;


-- ============================================================
-- FUNCTION: mark_agent_messages_read
-- Resets unread_count to 0 when user opens an agent chat.
-- ============================================================

create or replace function public.mark_agent_messages_read(p_agent_id uuid)
returns void
language plpgsql security definer as $$
begin
  update public.agents
  set unread_count = 0
  where id = p_agent_id
    and user_id = auth.uid();
end;
$$;


-- ============================================================
-- FUNCTION: search_messages
-- Full-text search across user's messages.
-- ============================================================

create or replace function public.search_messages(
  p_query  text,
  p_limit  integer default 20
)
returns table (
  message_id      uuid,
  content         text,
  agent_name      text,
  agent_type      agent_type,
  conversation_id uuid,
  created_at      timestamptz,
  rank            float4
)
language sql security definer stable as $$
  select
    m.id,
    m.content,
    a.name,
    a.type,
    c.id,
    m.created_at,
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', p_query))
  from public.messages m
  inner join public.conversations c on c.id = m.conversation_id
  inner join public.agents a        on a.id = c.agent_id
  where c.user_id = auth.uid()
    and to_tsvector('english', m.content) @@ plainto_tsquery('english', p_query)
  order by ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', p_query)) desc
  limit p_limit;
$$;


-- ============================================================
-- FUNCTION: get_kpi_chart_data
-- Returns time-series KPI data for a given metric.
-- ============================================================

create or replace function public.get_kpi_chart_data(
  p_agent_type agent_type,
  p_metric_key text,
  p_days       integer default 30
)
returns table (
  recorded_at  timestamptz,
  metric_value numeric,
  unit         text
)
language sql security definer stable as $$
  select recorded_at, metric_value, unit
  from public.kpi_snapshots
  where user_id    = auth.uid()
    and agent_type = p_agent_type
    and metric_key = p_metric_key
    and recorded_at > now() - (p_days || ' days')::interval
  order by recorded_at asc;
$$;


-- ============================================================
-- TRIGGER: auto-log agent status changes
-- ============================================================

create or replace function public.log_agent_status_change()
returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status then
    insert into public.agent_status_log (agent_id, old_status, new_status, task)
    values (new.id, old.status, new.status, new.current_task);
  end if;
  return new;
end;
$$;

create trigger trg_agent_status_log
  after update on public.agents
  for each row execute function public.log_agent_status_change();


-- ============================================================
-- VIEWS (read-only, for convenience)
-- ============================================================

-- Active agents summary view
create or replace view public.v_active_agents as
  select
    a.id, a.type, a.name, a.status, a.avatar_color,
    a.current_task, a.unread_count, a.updated_at,
    count(c.id) as conversation_count
  from public.agents a
  left join public.conversations c on c.agent_id = a.id and c.user_id = a.user_id
  group by a.id;

-- No RLS on views — access controlled by underlying tables + security invoker default

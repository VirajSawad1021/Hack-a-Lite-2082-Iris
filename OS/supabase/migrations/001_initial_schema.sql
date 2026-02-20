-- ============================================================
-- NexOS — Initial Schema
-- Migration: 001_initial_schema.sql
-- Run this first in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- for fast text search


-- ============================================================
-- ENUMS
-- ============================================================

create type agent_type as enum (
  'orchestrator',
  'sales',
  'customer_service',
  'technical',
  'market_intelligence',
  'meeting',
  'hr_ops'
);

create type agent_status as enum (
  'idle',
  'working',
  'attention',
  'offline'
);

create type message_role as enum (
  'user',
  'agent',
  'system'
);

create type message_content_type as enum (
  'text',
  'markdown',
  'code',
  'tool_call',
  'tool_result',
  'file',
  'image'
);

create type report_status as enum (
  'generating',
  'ready',
  'error'
);

create type agora_profile_type as enum (
  'startup',
  'investor',
  'partner'
);


-- ============================================================
-- PROFILES  (extends auth.users 1-to-1)
-- ============================================================

create table public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  workspace_name  text        not null default 'My Workspace',
  full_name       text,
  avatar_url      text,
  role            text        not null default 'owner',   -- owner | admin | member
  plan            text        not null default 'free',    -- free | starter | pro | enterprise
  onboarded       boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. Extended workspace metadata.';


-- ============================================================
-- AGENTS  (per-workspace agent configurations)
-- ============================================================

create table public.agents (
  id              uuid          primary key default uuid_generate_v4(),
  user_id         uuid          not null references public.profiles(id) on delete cascade,
  type            agent_type    not null,
  name            text          not null,
  description     text,
  status          agent_status  not null default 'idle',
  avatar_color    text          not null default '#6366F1',
  current_task    text,
  unread_count    integer       not null default 0,
  config          jsonb         not null default '{}',    -- agent-specific settings
  tools_connected jsonb         not null default '[]',   -- ["crm","slack","calendar",...]
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),
  unique (user_id, type)        -- one of each type per workspace
);

comment on column public.agents.config is 'JSON bag for agent-specific config: model, temperature, system_prompt, integrations, etc.';
comment on column public.agents.tools_connected is 'List of connected tool identifiers.';


-- ============================================================
-- CONVERSATIONS
-- ============================================================

create table public.conversations (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  agent_id    uuid        not null references public.agents(id) on delete cascade,
  title       text,
  summary     text,         -- auto-generated after N messages
  is_starred  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_conversations_user_agent on public.conversations(user_id, agent_id);
create index idx_conversations_updated    on public.conversations(updated_at desc);


-- ============================================================
-- MESSAGES
-- ============================================================

create table public.messages (
  id               uuid                 primary key default uuid_generate_v4(),
  conversation_id  uuid                 not null references public.conversations(id) on delete cascade,
  role             message_role         not null,
  content          text                 not null,
  content_type     message_content_type not null default 'text',
  metadata         jsonb                not null default '{}',  -- tool_name, file_url, model, tokens, etc.
  created_at       timestamptz          not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id, created_at asc);
create index idx_messages_role         on public.messages(role);

-- Full-text search on message content
create index idx_messages_fts on public.messages
  using gin(to_tsvector('english', content));


-- ============================================================
-- REPORTS
-- ============================================================

create table public.reports (
  id          uuid          primary key default uuid_generate_v4(),
  user_id     uuid          not null references public.profiles(id) on delete cascade,
  agent_id    uuid          references public.agents(id) on delete set null,
  title       text          not null,
  summary     text,
  content     text,          -- full markdown content
  status      report_status not null default 'ready',
  tags        text[]        not null default '{}',
  metadata    jsonb         not null default '{}',
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

create index idx_reports_user    on public.reports(user_id, created_at desc);
create index idx_reports_agent   on public.reports(agent_id);
create index idx_reports_tags    on public.reports using gin(tags);


-- ============================================================
-- AGORA PROFILES  (public AI social network)
-- ============================================================

create table public.agora_profiles (
  id              uuid               primary key default uuid_generate_v4(),
  user_id         uuid               references public.profiles(id) on delete set null,
  type            agora_profile_type not null default 'startup',
  name            text               not null,
  tagline         text,
  description     text,
  sector          text,
  stage           text,              -- seed | series-a | series-b | growth
  team_size       integer,
  website         text,
  logo_url        text,
  founded_year    integer,
  location        text,
  metrics         jsonb              not null default '{}', -- { arr: 120000, growth: 0.22, ... }
  is_public       boolean            not null default true,
  is_verified     boolean            not null default false,
  follower_count  integer            not null default 0,
  created_at      timestamptz        not null default now(),
  updated_at      timestamptz        not null default now()
);

create index idx_agora_type    on public.agora_profiles(type);
create index idx_agora_sector  on public.agora_profiles(sector);
create index idx_agora_public  on public.agora_profiles(is_public) where is_public = true;

-- Full-text search on agora profiles
create index idx_agora_fts on public.agora_profiles
  using gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(tagline,'') || ' ' || coalesce(sector,'')));


-- ============================================================
-- AGORA CONNECTIONS
-- ============================================================

create table public.agora_connections (
  id           uuid        primary key default uuid_generate_v4(),
  from_id      uuid        not null references public.agora_profiles(id) on delete cascade,
  to_id        uuid        not null references public.agora_profiles(id) on delete cascade,
  status       text        not null default 'pending',   -- pending | accepted | ignored
  created_at   timestamptz not null default now(),
  unique (from_id, to_id)
);

create index idx_connections_from on public.agora_connections(from_id);
create index idx_connections_to   on public.agora_connections(to_id);


-- ============================================================
-- AGENT STATUS LOG  (history / audit trail)
-- ============================================================

create table public.agent_status_log (
  id          uuid          primary key default uuid_generate_v4(),
  agent_id    uuid          not null references public.agents(id) on delete cascade,
  old_status  agent_status,
  new_status  agent_status  not null,
  task        text,
  created_at  timestamptz   not null default now()
);

create index idx_status_log_agent on public.agent_status_log(agent_id, created_at desc);


-- ============================================================
-- KPI SNAPSHOTS  (for dashboard charts)
-- ============================================================

create table public.kpi_snapshots (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  agent_type  agent_type  not null,
  metric_key  text        not null,   -- e.g. "pipeline_value", "nps_score", "uptime"
  metric_value numeric    not null,
  unit        text,                   -- "$", "%", "ms", etc.
  recorded_at timestamptz not null default now()
);

create index idx_kpi_user_agent on public.kpi_snapshots(user_id, agent_type, recorded_at desc);
create index idx_kpi_metric     on public.kpi_snapshots(metric_key, recorded_at desc);


-- ============================================================
-- TOOL CONNECTIONS  (OAuth integrations per user)
-- ============================================================

create table public.tool_connections (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  tool_name     text        not null,   -- "hubspot" | "salesforce" | "slack" | "github" | "calendar"
  is_connected  boolean     not null default false,
  access_token  text,                   -- encrypted at rest via pgsodium in production
  refresh_token text,
  token_expiry  timestamptz,
  scopes        text[]      not null default '{}',
  metadata      jsonb       not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, tool_name)
);

create index idx_tools_user on public.tool_connections(user_id);


-- ============================================================
-- UPDATED_AT trigger  (auto-bump updated_at on every update)
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach trigger to all tables with updated_at
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'agents', 'conversations',
    'reports', 'agora_profiles', 'tool_connections'
  ]
  loop
    execute format(
      'create trigger trg_%I_updated_at
       before update on public.%I
       for each row execute function public.handle_updated_at()',
      t, t
    );
  end loop;
end;
$$;


-- ============================================================
-- NEW USER HANDLER  (auto-create profile + default agents)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path  = public
set row_security = off   -- auth.uid() is NULL at trigger time; bypass RLS
as $$
declare
  agent_configs jsonb[] := array[
    '{"type":"orchestrator","name":"Master Orchestrator","description":"Coordinates all agents","avatar_color":"#6366F1"}'::jsonb,
    '{"type":"sales","name":"Sales Agent","description":"Pipeline management, CRM, deal tracking","avatar_color":"#06B6D4"}'::jsonb,
    '{"type":"customer_service","name":"Customer Service","description":"Support tickets, NPS, customer health","avatar_color":"#10B981"}'::jsonb,
    '{"type":"technical","name":"Technical Agent","description":"Engineering metrics, deployments, system health","avatar_color":"#F59E0B"}'::jsonb,
    '{"type":"market_intelligence","name":"Market Intelligence","description":"Competitor tracking, trends, industry news","avatar_color":"#8B5CF6"}'::jsonb,
    '{"type":"meeting","name":"Meeting Agent","description":"Scheduling, transcription, action items","avatar_color":"#F43F5E"}'::jsonb,
    '{"type":"hr_ops","name":"HR & Ops Agent","description":"Team management, hiring, operations","avatar_color":"#EC4899"}'::jsonb
  ];
  cfg jsonb;
begin
  -- 1. Create profile
  insert into public.profiles (id, full_name, workspace_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'workspace_name', split_part(new.email, '@', 1) || '''s Workspace')
  );

  -- 2. Provision all 7 default agents
  foreach cfg in array agent_configs loop
    insert into public.agents (user_id, type, name, description, avatar_color)
    values (
      new.id,
      (cfg->>'type')::agent_type,
      cfg->>'name',
      cfg->>'description',
      cfg->>'avatar_color'
    );
  end loop;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

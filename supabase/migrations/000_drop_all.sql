-- ============================================================
-- NexOS — DROP EVERYTHING
-- File: 000_drop_all.sql
--
-- Run this FIRST in Supabase SQL Editor to wipe the slate clean.
-- Then run 001 → 002 → 003 → seed.sql in order.
-- ============================================================


-- ── 1. Drop trigger on auth.users ──────────────────────────
drop trigger if exists on_auth_user_created on auth.users;


-- ── 2. Drop views ──────────────────────────────────────────
drop view if exists public.v_active_agents;


-- ── 3. Drop all functions ──────────────────────────────────
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_updated_at() cascade;
drop function if exists public.get_agent_dashboard_summary(uuid) cascade;
drop function if exists public.get_conversation_messages(uuid, integer, timestamptz) cascade;
drop function if exists public.upsert_conversation_and_message(uuid, uuid, message_role, text, message_content_type, jsonb) cascade;
drop function if exists public.mark_agent_messages_read(uuid) cascade;
drop function if exists public.search_messages(text, integer) cascade;
drop function if exists public.get_kpi_chart_data(agent_type, text, integer) cascade;


-- ── 4. Remove tables from realtime publication ─────────────
-- (safe to run even if they were never added)
do $$
declare
  t text;
begin
  foreach t in array array[
    'agents', 'messages', 'conversations',
    'reports', 'kpi_snapshots', 'agent_status_log'
  ] loop
    begin
      execute format(
        'alter publication supabase_realtime drop table public.%I', t
      );
    exception when others then
      null; -- ignore if table wasn't in the publication
    end;
  end loop;
end;
$$;


-- ── 5. Drop tables (reverse FK order) ─────────────────────
drop table if exists public.tool_connections      cascade;
drop table if exists public.kpi_snapshots         cascade;
drop table if exists public.agent_status_log      cascade;
drop table if exists public.agora_connections     cascade;
drop table if exists public.agora_profiles        cascade;
drop table if exists public.reports               cascade;
drop table if exists public.messages              cascade;
drop table if exists public.conversations         cascade;
drop table if exists public.agents                cascade;
drop table if exists public.profiles              cascade;


-- ── 6. Drop custom enums ───────────────────────────────────
drop type if exists public.agora_profile_type     cascade;
drop type if exists public.report_status          cascade;
drop type if exists public.message_content_type   cascade;
drop type if exists public.message_role           cascade;
drop type if exists public.agent_status           cascade;
drop type if exists public.agent_type             cascade;


-- ── Done ───────────────────────────────────────────────────
select 'NexOS schema wiped clean. Ready for fresh migrations.' as result;

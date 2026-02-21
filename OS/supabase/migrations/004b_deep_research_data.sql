-- ============================================================
-- NexOS — Migration 004b (Part B): Deep Research data + functions
-- ▶ Run this in Supabase SQL Editor AFTER 004_add_deep_research.sql
-- ============================================================

-- 1. Provision 'deep_research' agent for all existing users
INSERT INTO public.agents (user_id, type, name, description, avatar_color)
SELECT
  p.id,
  'deep_research'::agent_type,
  'Deep Research',
  'Multi-source internet research & comprehensive reports',
  '#0EA5E9'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.agents a
  WHERE a.user_id = p.id AND a.type = 'deep_research'
);

-- 2. Update handle_new_user() to create deep_research for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path  = public
SET row_security = off
AS $$
DECLARE
  agent_configs jsonb[] := array[
    '{"type":"orchestrator","name":"Master Orchestrator","description":"Coordinates all agents","avatar_color":"#6366F1"}'::jsonb,
    '{"type":"sales","name":"Sales Agent","description":"Pipeline management, CRM, deal tracking","avatar_color":"#06B6D4"}'::jsonb,
    '{"type":"customer_service","name":"Customer Service","description":"Support tickets, NPS, customer health","avatar_color":"#10B981"}'::jsonb,
    '{"type":"technical","name":"Technical Agent","description":"Engineering metrics, deployments, system health","avatar_color":"#F59E0B"}'::jsonb,
    '{"type":"market_intelligence","name":"Market Intelligence","description":"Competitor tracking, trends, industry news","avatar_color":"#8B5CF6"}'::jsonb,
    '{"type":"meeting","name":"Meeting Agent","description":"Scheduling, transcription, action items","avatar_color":"#F43F5E"}'::jsonb,
    '{"type":"hr_ops","name":"HR & Ops Agent","description":"Team management, hiring, operations","avatar_color":"#EC4899"}'::jsonb,
    '{"type":"deep_research","name":"Deep Research","description":"Multi-source internet research & comprehensive reports","avatar_color":"#0EA5E9"}'::jsonb
  ];
  cfg jsonb;
BEGIN
  INSERT INTO public.profiles (id, full_name, workspace_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'workspace_name', split_part(NEW.email, '@', 1) || '''s Workspace')
  );

  FOREACH cfg IN ARRAY agent_configs LOOP
    INSERT INTO public.agents (user_id, type, name, description, avatar_color)
    VALUES (
      NEW.id,
      (cfg->>'type')::agent_type,
      cfg->>'name',
      cfg->>'description',
      cfg->>'avatar_color'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3. Update get_agent_dashboard_summary to include deep_research ordering
CREATE OR REPLACE FUNCTION public.get_agent_dashboard_summary(p_user_id uuid)
RETURNS TABLE (
  agent_id        uuid,
  agent_type      agent_type,
  agent_name      text,
  status          agent_status,
  avatar_color    text,
  current_task    text,
  unread_count    integer,
  last_message    text,
  last_message_at timestamptz,
  conversation_id uuid
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    a.id,
    a.type,
    a.name,
    a.status,
    a.avatar_color,
    a.current_task,
    a.unread_count,
    m.content,
    m.created_at,
    c.id
  FROM public.agents a
  LEFT JOIN LATERAL (
    SELECT c2.id, c2.updated_at
    FROM public.conversations c2
    WHERE c2.agent_id = a.id AND c2.user_id = p_user_id
    ORDER BY c2.updated_at DESC
    LIMIT 1
  ) c ON true
  LEFT JOIN LATERAL (
    SELECT m2.content, m2.created_at
    FROM public.messages m2
    WHERE m2.conversation_id = c.id
    ORDER BY m2.created_at DESC
    LIMIT 1
  ) m ON true
  WHERE a.user_id = p_user_id
  ORDER BY
    CASE a.type
      WHEN 'orchestrator'        THEN 1
      WHEN 'sales'               THEN 2
      WHEN 'customer_service'    THEN 3
      WHEN 'technical'           THEN 4
      WHEN 'market_intelligence' THEN 5
      WHEN 'meeting'             THEN 6
      WHEN 'hr_ops'              THEN 7
      WHEN 'deep_research'       THEN 8
      ELSE 9
    END;
$$;

// ============================================================
// NexOS — Typed database query helpers
// src/lib/db.ts
//
// Usage (client):
//   import { db } from '@/lib/db'
//   const agents = await db.agents.listForUser()
//
// Usage (server component):
//   import { dbServer } from '@/lib/db'
//   const messages = await dbServer.messages.listForConversation(convId)
// ============================================================

import { createClient } from '@/lib/supabase/client'
import type {
  Agent, Conversation, Message, Report, AgoraProfile, KpiSnapshot, ToolConnection,
  AgentType,
} from '@/types/database'

// ── Browser-side helpers ───────────────────────────────────

export const db = {

  // ── Agents ──────────────────────────────────────────────

  agents: {
    async listForUser(): Promise<Agent[]> {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },

    async updateStatus(agentId: string, status: Agent['status'], currentTask?: string | null) {
      const supabase = createClient()
      const { error } = await supabase
        .from('agents')
        .update({ status, current_task: currentTask ?? null })
        .eq('id', agentId)
      if (error) throw error
    },

    async markRead(agentId: string) {
      const supabase = createClient()
      await supabase.rpc('mark_agent_messages_read', { p_agent_id: agentId })
    },
  },

  // ── Conversations ────────────────────────────────────────

  conversations: {
    async listForAgent(agentId: string): Promise<Conversation[]> {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  },

  // ── Messages ─────────────────────────────────────────────

  messages: {
    async send(params: {
      agentId: string
      conversationId?: string
      role: Message['role']
      content: string
      contentType?: Message['content_type']
    }): Promise<{ conversationId: string; messageId: string }> {
      const supabase = createClient()
      const result = await supabase.rpc('upsert_conversation_and_message', {
        p_agent_id:        params.agentId,
        p_conversation_id: params.conversationId ?? null,
        p_role:            params.role,
        p_content:         params.content,
        p_content_type:    params.contentType ?? 'text',
      })
      if (result.error) throw result.error
      const row = result.data?.[0]
      return {
        conversationId: row?.conversation_id ?? '',
        messageId:      row?.message_id ?? '',
      }
    },

    async listForConversation(
      conversationId: string,
      limit = 50,
    ): Promise<Message[]> {
      const supabase = createClient()
      const result = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId,
        p_limit:           limit,
      })
      if (result.error) throw result.error
      return (result.data ?? []) as Message[]
    },

    async search(query: string): Promise<{
      message_id: string
      content: string
      agent_name: string
      agent_type: AgentType
      conversation_id: string
      created_at: string
    }[]> {
      const supabase = createClient()
      const result = await supabase.rpc('search_messages', { p_query: query })
      if (result.error) throw result.error
      return result.data ?? []
    },
  },

  // ── Reports ──────────────────────────────────────────────

  reports: {
    async list(agentId?: string): Promise<Report[]> {
      const supabase = createClient()
      let q = supabase.from('reports').select('*').order('created_at', { ascending: false })
      if (agentId) q = q.eq('agent_id', agentId)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  },

  // ── Agora ────────────────────────────────────────────────

  agora: {
    async listPublic(sector?: string, type?: AgoraProfile['type']): Promise<AgoraProfile[]> {
      const supabase = createClient()
      let q = supabase
        .from('agora_profiles')
        .select('*')
        .eq('is_public', true)
        .order('follower_count', { ascending: false })
      if (sector) q = q.eq('sector', sector)
      if (type)   q = q.eq('type', type)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  },

  // ── KPIs ─────────────────────────────────────────────────

  kpis: {
    async getChartData(agentType: AgentType, metricKey: string, days = 30): Promise<KpiSnapshot[]> {
      const supabase = createClient()
      const result = await supabase.rpc('get_kpi_chart_data', {
        p_agent_type: agentType,
        p_metric_key: metricKey,
        p_days:       days,
      })
      if (result.error) throw result.error
      return (result.data ?? []) as unknown as KpiSnapshot[]
    },
  },

  // ── Tool connections ──────────────────────────────────────

  tools: {
    async list(): Promise<ToolConnection[]> {
      const supabase = createClient()
      const { data, error } = await supabase.from('tool_connections').select('*')
      if (error) throw error
      return data ?? []
    },

    async upsert(toolName: string, isConnected: boolean): Promise<void> {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('tool_connections')
        .upsert({ user_id: user.id, tool_name: toolName, is_connected: isConnected })
      if (error) throw error
    },
  },
}

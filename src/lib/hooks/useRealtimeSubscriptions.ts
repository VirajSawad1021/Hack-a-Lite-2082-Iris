import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgentStatus, Message } from '@/types/database'
import { useAgentStore } from '@/store/agentStore'
import { useChatStore } from '@/store/chatStore'

//  Hook: subscribe to a single agent status in realtime 

export function useAgentStatus(agentId: string) {
  const [status, setStatus] = useState<AgentStatus>('idle')
  const supabase = createClient()

  useEffect(() => {
    if (!agentId) return

    const channel = supabase
      .channel(`agent-status-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
          filter: `id=eq.${agentId}`,
        },
        (payload) => {
          const updated = payload.new as { status: AgentStatus; current_task?: string }
          setStatus(updated.status)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [agentId]) // eslint-disable-line

  return status
}


//  Hook: subscribe to all agents for this user in realtime 

export function useAllAgentStatuses(userId: string | undefined) {
  const { updateAgentStatus } = useAgentStore()
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('all-agent-statuses')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const agent = payload.new as { id: string; status: AgentStatus }
          updateAgentStatus(agent.id, agent.status)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId]) // eslint-disable-line
}


//  Hook: subscribe to new messages in a conversation 

export function useConversationMessages(
  conversationId: string | null,
  onNewMessage?: (msg: Message) => void
) {
  const supabase = createClient()

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onNewMessage?.(payload.new as Message)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId]) // eslint-disable-line
}


//  Hook: subscribe to reports being generated 

export function useReportUpdates(userId: string | undefined) {
  const [latestReport, setLatestReport] = useState<{ id: string; title: string; status: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('reports-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const r = payload.new as { id: string; title: string; status: string }
          setLatestReport(r)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId]) // eslint-disable-line

  return latestReport
}

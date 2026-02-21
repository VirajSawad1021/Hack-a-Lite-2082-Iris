'use client'
/**
 * useRecentConversations
 * ───────────────────────
 * Fetches the most recent conversations across ALL agents from Supabase.
 * Used by AgentSidebar to render a "Recents" list like Claude/ChatGPT.
 * Also provides loadConversation() to switch agent + hydrate messages.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/store/chatStore'
import { AGENTS } from '@/store/agentStore'

export interface RecentConversation {
  id: string
  title: string | null
  summary: string | null
  last_message: string | null
  updated_at: string
  agent_type: string
  agent_store_id: string   // matches AGENTS[].id in the frontend store
}

interface UseRecentConversationsReturn {
  recents: RecentConversation[]
  loading: boolean
  /** Switch to the agent and load the conversation's messages */
  loadConversation: (conv: RecentConversation) => Promise<void>
  refresh: () => void
}

export function useRecentConversations(limit = 12): UseRecentConversationsReturn {
  const [recents, setRecents] = useState<RecentConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const tickRef = useRef(0)

  const { setMessages } = useChatStore()

  useEffect(() => {
    let cancelled = false

    async function fetchRecents() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Join conversations → agents to get agent type alongside conversation data
        const { data, error } = await supabase
          .from('conversations')
          .select('id, title, summary, updated_at, agents!inner(type)')
          .eq('agents.user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(limit) as unknown as {
            data: Array<{
              id: string
              title: string | null
              summary: string | null
              updated_at: string
              agents: { type: string }
            }> | null
            error: unknown
          }

        if (error || !data || cancelled) return

        // For each conversation get the last message preview
        const enriched: RecentConversation[] = await Promise.all(
          data.map(async (row) => {
            const { data: msgs } = await supabase
              .from('messages')
              .select('content, role')
              .eq('conversation_id', row.id)
              .order('created_at', { ascending: false })
              .limit(1) as unknown as { data: Array<{ content: string; role: string }> | null }

            // Map DB agent type → frontend store agent id
            const frontendAgent = AGENTS.find(a => a.type === row.agents.type)

            return {
              id: row.id,
              title: row.title,
              summary: row.summary,
              last_message: msgs?.[0]?.content ?? null,
              updated_at: row.updated_at,
              agent_type: row.agents.type,
              agent_store_id: frontendAgent?.id ?? row.agents.type,
            }
          })
        )

        if (!cancelled) setRecents(enriched)
      } catch {
        // Non-fatal
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRecents()
    return () => { cancelled = true }
  }, [limit, tick])

  const loadConversation = useCallback(async (conv: RecentConversation) => {
    try {
      const supabase = createClient()
      const { data: msgs, error } = await (supabase as any).rpc(
        'get_conversation_messages',
        { p_conversation_id: conv.id, p_limit: 200 },
      ) as {
        data: Array<{ id: string; role: string; content: string; created_at: string }> | null
        error: unknown
      }

      if (error || !msgs) return

      setMessages(conv.agent_store_id, msgs.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'agent' | 'system',
        content: m.content,
        content_type: 'text' as const,
        conversation_id: conv.id,
        created_at: m.created_at,
      })))
    } catch {
      // Non-fatal
    }
  }, [setMessages])

  const refresh = useCallback(() => {
    tickRef.current += 1
    setTick(tickRef.current)
  }, [])

  return { recents, loading, loadConversation, refresh }
}

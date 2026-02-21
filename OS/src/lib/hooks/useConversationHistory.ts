'use client'
/**
 * useConversationHistory
 * ──────────────────────
 * Fetches the list of past conversations for a given agent type from Supabase.
 * Also provides `loadConversation(id)` to hydrate the chatStore with messages
 * from a selected past conversation.
 *
 * Usage in ChatInterface:
 *   const { conversations, loading, loadConversation } =
 *     useConversationHistory(activeAgent.type, activeAgentId, switchConversation)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/store/chatStore'

export interface ConversationSummary {
  id: string
  title: string | null
  summary: string | null
  updated_at: string
  message_count: number
  last_message: string | null
}

interface UseConversationHistoryReturn {
  conversations: ConversationSummary[]
  loading: boolean
  /** Load all messages from a past conversation into the chatStore */
  loadConversation: (conversationId: string) => Promise<void>
  /** Re-fetch the list (call after starting a new conversation) */
  refresh: () => void
}

export function useConversationHistory(
  agentType: string,
  agentStoreId: string,
  /** Callback to tell useChatPersistence which conversation is now active */
  onConversationSwitch?: (conversationId: string) => void,
): UseConversationHistoryReturn {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const refreshCounterRef = useRef(0)
  const [refreshTick, setRefreshTick] = useState(0)

  const { setMessages } = useChatStore()

  // ── Fetch conversation list ─────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetch() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Resolve agent UUID by type
        const { data: agentRow } = await supabase
          .from('agents')
          .select('id')
          .eq('type', agentType)
          .single() as unknown as { data: { id: string } | null }

        if (!agentRow) return

        // Fetch conversations ordered most-recent first
        const { data: convRows } = await supabase
          .from('conversations')
          .select('id, title, summary, updated_at')
          .eq('agent_id', agentRow.id)
          .order('updated_at', { ascending: false })
          .limit(30) as unknown as {
            data: Array<{ id: string; title: string | null; summary: string | null; updated_at: string }> | null
          }

        if (cancelled || !convRows) return

        // For each conversation get the last message preview & count
        const enriched: ConversationSummary[] = await Promise.all(
          convRows.map(async (conv) => {
            const { data: msgs } = await supabase
              .from('messages')
              .select('id, content, role')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1) as unknown as { data: Array<{ id: string; content: string; role: string }> | null }

            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id) as unknown as { count: number | null }

            return {
              id: conv.id,
              title: conv.title,
              summary: conv.summary,
              updated_at: conv.updated_at,
              message_count: count ?? 0,
              last_message: msgs?.[0]?.content ?? null,
            }
          })
        )

        if (!cancelled) setConversations(enriched)
      } catch {
        // Non-fatal
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [agentType, refreshTick])

  // ── Load a selected conversation's messages into chatStore ──
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const supabase = createClient()
      const { data: msgs, error } = await (supabase as any).rpc(
        'get_conversation_messages',
        { p_conversation_id: conversationId, p_limit: 200 },
      ) as {
        data: Array<{ id: string; role: string; content: string; content_type: string; created_at: string }> | null
        error: unknown
      }

      if (error || !msgs) return

      // Replace this agent's messages with the loaded ones
      const formatted = msgs.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'agent' | 'system',
        content: m.content,
        content_type: 'text' as const,
        conversation_id: conversationId,
        created_at: m.created_at,
      }))

      setMessages(agentStoreId, formatted)
      onConversationSwitch?.(conversationId)
    } catch {
      // Non-fatal
    }
  }, [agentStoreId, onConversationSwitch])

  const refresh = useCallback(() => {
    refreshCounterRef.current += 1
    setRefreshTick(refreshCounterRef.current)
  }, [])

  return { conversations, loading, loadConversation, refresh }
}

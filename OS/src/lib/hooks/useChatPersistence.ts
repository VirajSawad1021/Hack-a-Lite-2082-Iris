'use client'
/**
 * useChatPersistence
 * ──────────────────
 * Saves every message to Supabase in the background and rehydrates
 * from Supabase when localStorage has no messages for that agent
 * (e.g. first visit, cleared storage, or different device).
 *
 * Architecture:
 *   localStorage (zustand/persist)  ← fast, local, survives refresh
 *   Supabase                        ← source of truth, cross-device
 *
 * The two stores stay in sync automatically:
 *   • Every new message → saved to Supabase (fire-and-forget, never blocks UI)
 *   • On mount with empty local store → load from Supabase into local store
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/store/chatStore'

interface UseChatPersistenceReturn {
  /** Call after adding a message locally — saves it to Supabase in background. */
  saveMessage: (role: 'user' | 'agent', content: string) => Promise<void>
  /** True once the initial Supabase load has completed (or confirmed unauthenticated). */
  loaded: boolean
  /** True if the user is authenticated and the agent row was found in Supabase. */
  connected: boolean
}

export function useChatPersistence(
  /** The frontend agent id string, e.g. "sales" — used as the chatStore key */
  agentStoreId: string,
  /** The agent type string sent to the DB enum: same as agentStoreId in our case */
  agentType: string,
): UseChatPersistenceReturn {
  const addMessage = useChatStore((s) => s.addMessage)

  // Supabase-side UUIDs — discovered once per mount
  const [dbAgentId, setDbAgentId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Prevent duplicate load on React StrictMode double-invoke
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    async function boot() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoaded(true); return }

        // ── 1. Resolve agent UUID by type ──────────────────────────
        const { data: agentRow, error: agentErr } = await supabase
          .from('agents')
          .select('id')
          .eq('type', agentType)
          .single() as unknown as { data: { id: string } | null; error: unknown }

        if (agentErr || !agentRow) { setLoaded(true); return }
        setDbAgentId(agentRow.id)

        // ── 2. Find the most recent conversation for this agent ────
        const { data: convRows } = await supabase
          .from('conversations')
          .select('id')
          .eq('agent_id', agentRow.id)
          .order('updated_at', { ascending: false })
          .limit(1) as unknown as { data: { id: string }[] | null }

        if (!convRows || convRows.length === 0) { setLoaded(true); return }
        const convId = convRows[0].id
        setConversationId(convId)

        // ── 3. Rehydrate only if local store is empty ──────────────
        // (localStorage already has data → no need to hit the network)
        const localMessages = useChatStore.getState().messages[agentStoreId] ?? []
        if (localMessages.length > 0) { setLoaded(true); return }

        // Load messages from Supabase
        const { data: msgs, error: msgErr } = await (supabase as any).rpc(
          'get_conversation_messages',
          { p_conversation_id: convId, p_limit: 100 },
        ) as { data: Array<{ id: string; role: string; content: string; content_type: string; created_at: string }> | null; error: unknown }

        if (!msgErr && msgs && msgs.length > 0) {
          for (const m of msgs) {
            addMessage(agentStoreId, {
              id:              m.id,
              role:            m.role as 'user' | 'agent' | 'system',
              content:         m.content,
              content_type:    'text',
              conversation_id: convId,
              created_at:      m.created_at,
            })
          }
        }
      } catch {
        // Non-fatal — localStorage is the fallback
      } finally {
        setLoaded(true)
      }
    }

    boot()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentType, agentStoreId])

  // ── Save a message to Supabase (fire-and-forget, never blocks UI) ──
  const saveMessage = useCallback(async (
    role: 'user' | 'agent',
    content: string,
  ): Promise<void> => {
    // No-op if unauthenticated or agent not found
    if (!dbAgentId) return

    try {
      const supabase = createClient()
      const result = await (supabase as any).rpc('upsert_conversation_and_message', {
        p_agent_id:        dbAgentId,
        p_conversation_id: conversationId ?? null,
        p_role:            role,
        p_content:         content,
        p_content_type:    'text',
      }) as { data: Array<{ conversation_id: string; message_id: string }> | null; error: unknown }

      if (!result.error && result.data?.[0]) {
        const row = result.data[0] as { conversation_id: string; message_id: string }
        // Update conversationId so all subsequent saves stay in the same conversation
        setConversationId(row.conversation_id)
      }
    } catch {
      // Silently swallow — localStorage already has the message
    }
  }, [dbAgentId, conversationId])

  return {
    saveMessage,
    loaded,
    connected: !!dbAgentId,
  }
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Message } from '@/types'

type PartialMessage = Pick<Message, 'role' | 'content' | 'content_type'> & Partial<Message>

interface ChatStore {
  messages: Record<string, Message[]>
  inputValue: string
  isTyping: Record<string, boolean>
  addMessage: (agentId: string, msg: PartialMessage) => void
  setTyping: (agentId: string, val: boolean) => void
  setInputValue: (val: string) => void
  clearMessages: (agentId: string) => void
  clearAllMessages: () => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: {},
      inputValue: '',
      isTyping: {},

      addMessage: (agentId, msg) =>
        set((state) => {
          const fullMsg: Message = {
            id: msg.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            conversation_id: msg.conversation_id ?? agentId,
            created_at: msg.created_at ?? new Date().toISOString(),
            ...msg,
          } as Message
          return {
            messages: {
              ...state.messages,
              [agentId]: [...(state.messages[agentId] ?? []), fullMsg],
            },
          }
        }),

      setTyping: (agentId, val) =>
        set((state) => ({
          isTyping: { ...state.isTyping, [agentId]: val },
        })),

      setInputValue: (val) => set({ inputValue: val }),

      clearMessages: (agentId) =>
        set((state) => ({
          messages: { ...state.messages, [agentId]: [] },
        })),

      clearAllMessages: () => set({ messages: {} }),
    }),
    {
      name: 'nexos-chat-history',   // localStorage key
      // Only persist messages — never persist transient typing/input state
      partialize: (state) => ({ messages: state.messages }),
    }
  )
)


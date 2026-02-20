import { create } from 'zustand'
import { Agent, AgentType, AgentStatus } from '@/types'

export const AGENTS: Agent[] = [
  {
    id: 'orchestrator',
    type: 'orchestrator',
    name: 'Master Orchestrator',
    description: 'Coordinates all agents and provides strategic direction',
    status: 'idle',
    avatar_color: '#6366F1',
    unread_count: 0,
  },
  {
    id: 'sales',
    type: 'sales',
    name: 'Sales Agent',
    description: 'Pipeline management, CRM, deal tracking',
    status: 'idle',
    avatar_color: '#06B6D4',
    unread_count: 2,
  },
  {
    id: 'customer_service',
    type: 'customer_service',
    name: 'Customer Service',
    description: 'Support tickets, NPS, customer health',
    status: 'working',
    avatar_color: '#10B981',
    unread_count: 5,
    current_task: 'Analyzing support ticket backlog',
  },
  {
    id: 'technical',
    type: 'technical',
    name: 'Technical Agent',
    description: 'Engineering metrics, deployments, system health',
    status: 'idle',
    avatar_color: '#F59E0B',
    unread_count: 0,
  },
  {
    id: 'market_intelligence',
    type: 'market_intelligence',
    name: 'Market Intelligence',
    description: 'Competitor tracking, trends, industry news',
    status: 'working',
    avatar_color: '#8B5CF6',
    unread_count: 3,
    current_task: 'Scanning fintech news',
  },
  {
    id: 'meeting',
    type: 'meeting',
    name: 'Meeting Agent',
    description: 'Scheduling, transcription, action items',
    status: 'idle',
    avatar_color: '#F43F5E',
    unread_count: 1,
  },
  {
    id: 'hr_ops',
    type: 'hr_ops',
    name: 'HR & Ops Agent',
    description: 'Team management, hiring, operations',
    status: 'attention',
    avatar_color: '#EC4899',
    unread_count: 0,
    current_task: 'Requires attention: new hire onboarding',
  },
]

interface AgentStore {
  agents: Agent[]
  activeAgentId: string
  sidebarCollapsed: boolean
  contextPanelOpen: boolean
  setActiveAgent: (id: string) => void
  updateAgentStatus: (id: string, status: AgentStatus) => void
  updateUnreadCount: (id: string, count: number) => void
  toggleSidebar: () => void
  toggleContextPanel: () => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: AGENTS,
  activeAgentId: 'orchestrator',
  sidebarCollapsed: false,
  contextPanelOpen: true,

  setActiveAgent: (id) => set({ activeAgentId: id }),

  updateAgentStatus: (id, status) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, status } : a)),
    })),

  updateUnreadCount: (id, count) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, unread_count: count } : a)),
    })),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  toggleContextPanel: () =>
    set((state) => ({ contextPanelOpen: !state.contextPanelOpen })),
}))

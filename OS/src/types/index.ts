export type AgentType = 'orchestrator' | 'sales' | 'customer_service' | 'technical' | 'market_intelligence' | 'meeting' | 'hr_ops' | 'deep_research'

export type AgentStatus = 'idle' | 'working' | 'attention' | 'offline'

export interface Agent {
  id: string
  type: AgentType
  name: string
  description: string
  status: AgentStatus
  avatar_color: string
  unread_count: number
  current_task?: string
  last_active?: string
}

export type MessageRole = 'user' | 'agent' | 'system'
export type MessageContentType = 'text' | 'report' | 'meeting_summary' | 'market_brief' | 'code'

export type StreamEventType =
  | 'agent_started'
  | 'tool_used'
  | 'thinking'
  | 'step'
  | 'text_chunk'
  | 'final_answer'
  | 'error'
  | 'done'

export interface StreamEvent {
  type: StreamEventType
  content?: string
  tool?: string
  input?: string
  agent_name?: string
  agent_type?: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  content_type: MessageContentType
  metadata?: Record<string, unknown>
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  agent_id: string
  agent_type: AgentType
  title: string
  last_message?: string
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  agent_type: AgentType
  title: string
  summary: string
  created_at: string
  download_url?: string
}

export interface AgoraProfile {
  id: string
  name: string
  type: 'startup' | 'investor'
  sector: string
  stage?: string
  location?: string
  traction_score: number
  connections: number
  bio: string
  recent_activity: string
}

export interface KPI {
  label: string
  value: string | number
  trend: 'up' | 'down' | 'flat'
  change_pct: number
}

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  workspace_name?: string
  created_at: string
}

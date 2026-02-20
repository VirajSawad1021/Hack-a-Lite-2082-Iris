// ============================================================
// NexOS — Supabase Database Types (auto-sync with migrations)
// src/types/database.ts
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AgentType = 'orchestrator' | 'sales' | 'customer_service' | 'technical' | 'market_intelligence' | 'meeting' | 'hr_ops'
export type AgentStatus = 'idle' | 'working' | 'attention' | 'offline'
export type MessageRole = 'user' | 'agent' | 'system'
export type MessageContentType = 'text' | 'markdown' | 'code' | 'tool_call' | 'tool_result' | 'file' | 'image'
export type ReportStatus = 'generating' | 'ready' | 'error'
export type AgoraProfileType = 'startup' | 'investor' | 'partner'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:             string
          workspace_name: string
          full_name:      string | null
          avatar_url:     string | null
          role:           string
          plan:           string
          onboarded:      boolean
          created_at:     string
          updated_at:     string
        }
        Insert: {
          id:             string
          workspace_name?: string
          full_name?:     string | null
          avatar_url?:    string | null
          role?:          string
          plan?:          string
          onboarded?:     boolean
        }
        Update: {
          workspace_name?: string
          full_name?:      string | null
          avatar_url?:     string | null
          role?:           string
          plan?:           string
          onboarded?:      boolean
        }
      }

      agents: {
        Row: {
          id:               string
          user_id:          string
          type:             AgentType
          name:             string
          description:      string | null
          status:           AgentStatus
          avatar_color:     string
          current_task:     string | null
          unread_count:     number
          config:           Json
          tools_connected:  Json
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id?:              string
          user_id:          string
          type:             AgentType
          name:             string
          description?:     string | null
          status?:          AgentStatus
          avatar_color?:    string
          current_task?:    string | null
          unread_count?:    number
          config?:          Json
          tools_connected?: Json
        }
        Update: {
          name?:            string
          description?:     string | null
          status?:          AgentStatus
          current_task?:    string | null
          unread_count?:    number
          config?:          Json
          tools_connected?: Json
        }
      }

      conversations: {
        Row: {
          id:         string
          user_id:    string
          agent_id:   string
          title:      string | null
          summary:    string | null
          is_starred: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:        string
          user_id:    string
          agent_id:   string
          title?:     string | null
          summary?:   string | null
          is_starred?: boolean
        }
        Update: {
          title?:     string | null
          summary?:   string | null
          is_starred?: boolean
        }
      }

      messages: {
        Row: {
          id:              string
          conversation_id: string
          role:            MessageRole
          content:         string
          content_type:    MessageContentType
          metadata:        Json
          created_at:      string
        }
        Insert: {
          id?:             string
          conversation_id: string
          role:            MessageRole
          content:         string
          content_type?:   MessageContentType
          metadata?:       Json
        }
        Update: never  // messages are immutable
      }

      reports: {
        Row: {
          id:         string
          user_id:    string
          agent_id:   string | null
          title:      string
          summary:    string | null
          content:    string | null
          status:     ReportStatus
          tags:       string[]
          metadata:   Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:        string
          user_id:    string
          agent_id?:  string | null
          title:      string
          summary?:   string | null
          content?:   string | null
          status?:    ReportStatus
          tags?:      string[]
          metadata?:  Json
        }
        Update: {
          title?:   string
          summary?: string | null
          content?: string | null
          status?:  ReportStatus
          tags?:    string[]
        }
      }

      agora_profiles: {
        Row: {
          id:             string
          user_id:        string | null
          type:           AgoraProfileType
          name:           string
          tagline:        string | null
          description:    string | null
          sector:         string | null
          stage:          string | null
          team_size:      number | null
          website:        string | null
          logo_url:       string | null
          founded_year:   number | null
          location:       string | null
          metrics:        Json
          is_public:      boolean
          is_verified:    boolean
          follower_count: number
          created_at:     string
          updated_at:     string
        }
        Insert: {
          id?:            string
          user_id?:       string | null
          type?:          AgoraProfileType
          name:           string
          tagline?:       string | null
          description?:   string | null
          sector?:        string | null
          stage?:         string | null
          team_size?:     number | null
          website?:       string | null
          logo_url?:      string | null
          founded_year?:  number | null
          location?:      string | null
          metrics?:       Json
          is_public?:     boolean
          is_verified?:   boolean
        }
        Update: {
          name?:        string
          tagline?:     string | null
          description?: string | null
          sector?:      string | null
          stage?:       string | null
          team_size?:   number | null
          website?:     string | null
          logo_url?:    string | null
          metrics?:     Json
          is_public?:   boolean
        }
      }

      agora_connections: {
        Row: {
          id:         string
          from_id:    string
          to_id:      string
          status:     string
          created_at: string
        }
        Insert: {
          id?:     string
          from_id: string
          to_id:   string
          status?: string
        }
        Update: {
          status?: string
        }
      }

      kpi_snapshots: {
        Row: {
          id:           string
          user_id:      string
          agent_type:   AgentType
          metric_key:   string
          metric_value: number
          unit:         string | null
          recorded_at:  string
        }
        Insert: {
          id?:          string
          user_id:      string
          agent_type:   AgentType
          metric_key:   string
          metric_value: number
          unit?:        string | null
          recorded_at?: string
        }
        Update: never
      }

      tool_connections: {
        Row: {
          id:            string
          user_id:       string
          tool_name:     string
          is_connected:  boolean
          access_token:  string | null
          refresh_token: string | null
          token_expiry:  string | null
          scopes:        string[]
          metadata:      Json
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:            string
          user_id:        string
          tool_name:      string
          is_connected?:  boolean
          access_token?:  string | null
          refresh_token?: string | null
          token_expiry?:  string | null
          scopes?:        string[]
          metadata?:      Json
        }
        Update: {
          is_connected?:  boolean
          access_token?:  string | null
          refresh_token?: string | null
          token_expiry?:  string | null
          scopes?:        string[]
          metadata?:      Json
        }
      }
    }

    Functions: {
      get_agent_dashboard_summary: {
        Args: { p_user_id: string }
        Returns: {
          agent_id:        string
          agent_type:      AgentType
          agent_name:      string
          status:          AgentStatus
          avatar_color:    string
          current_task:    string | null
          unread_count:    number
          last_message:    string | null
          last_message_at: string | null
          conversation_id: string | null
        }[]
      }
      get_conversation_messages: {
        Args: { p_conversation_id: string; p_limit?: number; p_before?: string }
        Returns: {
          id:           string
          role:         MessageRole
          content:      string
          content_type: MessageContentType
          metadata:     Json
          created_at:   string
        }[]
      }
      upsert_conversation_and_message: {
        Args: {
          p_agent_id:        string
          p_conversation_id?: string | null
          p_role?:           MessageRole
          p_content?:        string
          p_content_type?:   MessageContentType
          p_metadata?:       Json
        }
        Returns: { conversation_id: string; message_id: string }[]
      }
      mark_agent_messages_read: {
        Args: { p_agent_id: string }
        Returns: void
      }
      search_messages: {
        Args: { p_query: string; p_limit?: number }
        Returns: {
          message_id:      string
          content:         string
          agent_name:      string
          agent_type:      AgentType
          conversation_id: string
          created_at:      string
          rank:            number
        }[]
      }
      get_kpi_chart_data: {
        Args: { p_agent_type: AgentType; p_metric_key: string; p_days?: number }
        Returns: { recorded_at: string; metric_value: number; unit: string | null }[]
      }
    }
  }
}

// ── Typed helpers (use these instead of raw supabase client) ──

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Convenience row types
export type Profile       = Tables<'profiles'>
export type Agent         = Tables<'agents'>
export type Conversation  = Tables<'conversations'>
export type Message       = Tables<'messages'>
export type Report        = Tables<'reports'>
export type AgoraProfile  = Tables<'agora_profiles'>
export type KpiSnapshot   = Tables<'kpi_snapshots'>
export type ToolConnection = Tables<'tool_connections'>
